/*
 * lazymacfan-helper.c — Universal macOS Hardware Helper for AppleSMC & IOHID
 *
 * Supports:
 * - Apple Silicon (M1/M2/M3/M4/M5) & Intel (x86_64) Macs
 * - Reading Fan Speeds (Actual, Min, Max, Target, Mode)
 * - Setting Fan Target RPM & Manual/Automatic modes
 * - Reading Temperature Sensors via IOHIDEventSystemClient & SMC
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdbool.h>
#include <mach/mach.h>
#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOKitLib.h>

#define KERNEL_INDEX_SMC 2
#define SMC_CMD_READ_BYTES 5
#define SMC_CMD_WRITE_BYTES 6
#define SMC_CMD_READ_KEYINFO 9

#define DATATYPE_FPE2 "fpe2"
#define DATATYPE_FLT  "flt "
#define DATATYPE_UI8  "ui8 "
#define DATATYPE_UI16 "ui16"
#define DATATYPE_UI32 "ui32"
#define DATATYPE_SP78 "sp78"

typedef struct {
    char major;
    char minor;
    char build;
    char reserved[1];
    UInt16 release;
} SMCKeyData_vers_t;

typedef struct {
    UInt16 version;
    UInt16 length;
    UInt32 cpuPLimit;
    UInt32 gpuPLimit;
    UInt32 memPLimit;
} SMCKeyData_pLimitData_t;

typedef struct {
    UInt32 dataSize;
    UInt32 dataType;
    char dataAttributes;
} SMCKeyData_keyInfo_t;

typedef char SMCBytes_t[32];

typedef struct {
    UInt32 key;
    SMCKeyData_vers_t vers;
    SMCKeyData_pLimitData_t pLimitData;
    SMCKeyData_keyInfo_t keyInfo;
    char result;
    char status;
    char data8;
    UInt32 data32;
    SMCBytes_t bytes;
} SMCKeyData_t;

/* IOHID declarations for thermal monitoring */
typedef struct __IOHIDEventSystemClient *IOHIDEventSystemClientRef;
typedef struct __IOHIDServiceClient *IOHIDServiceClientRef;
typedef struct __IOHIDEvent *IOHIDEventRef;

IOHIDEventSystemClientRef IOHIDEventSystemClientCreate(CFAllocatorRef allocator);
int IOHIDEventSystemClientSetMatching(IOHIDEventSystemClientRef client, CFDictionaryRef match);
CFArrayRef IOHIDEventSystemClientCopyServices(IOHIDEventSystemClientRef client);
CFTypeRef IOHIDServiceClientCopyProperty(IOHIDServiceClientRef service, CFStringRef property);
IOHIDEventRef IOHIDServiceClientCopyEvent(IOHIDServiceClientRef service, int64_t type, int32_t options, int64_t timeout);
double IOHIDEventGetFloatValue(IOHIDEventRef event, int32_t field);

#define kIOHIDEventTypeTemperature 15
#define IOHIDEventFieldBase(type) ((type) << 16)

static UInt32 strToKey(const char *str) {
    UInt32 total = 0;
    for (int i = 0; i < 4 && str[i] != '\0'; i++) {
        total += ((unsigned char)str[i]) << ((3 - i) * 8);
    }
    return total;
}

static void keyToStr(UInt32 val, char *str) {
    str[0] = (val >> 24) & 0xff;
    str[1] = (val >> 16) & 0xff;
    str[2] = (val >> 8) & 0xff;
    str[3] = val & 0xff;
    str[4] = '\0';
}

static io_connect_t openSMC(void) {
    io_service_t service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("AppleSMC"));
    if (!service) return 0;
    io_connect_t conn = 0;
    kern_return_t kr = IOServiceOpen(service, mach_task_self(), 0, &conn);
    IOObjectRelease(service);
    if (kr != KERN_SUCCESS) return 0;
    return conn;
}

static void closeSMC(io_connect_t conn) {
    if (conn) {
        IOServiceClose(conn);
    }
}

static int readSMCRaw(io_connect_t conn, const char *key, SMCKeyData_t *valOut, char *typeOut) {
    SMCKeyData_t in, out;
    memset(&in, 0, sizeof(in));
    memset(&out, 0, sizeof(out));

    in.key = strToKey(key);
    in.data8 = SMC_CMD_READ_KEYINFO;
    size_t s = sizeof(SMCKeyData_t);
    if (IOConnectCallStructMethod(conn, KERNEL_INDEX_SMC, &in, s, &out, &s) != KERN_SUCCESS) return -1;
    if (out.result != 0) return -1;

    keyToStr(out.keyInfo.dataType, typeOut);
    UInt32 size = out.keyInfo.dataSize;
    if (size == 0) return -1;

    memset(&in, 0, sizeof(in));
    in.key = strToKey(key);
    in.keyInfo.dataSize = size;
    in.data8 = SMC_CMD_READ_BYTES;
    s = sizeof(SMCKeyData_t);
    if (IOConnectCallStructMethod(conn, KERNEL_INDEX_SMC, &in, s, valOut, &s) != KERN_SUCCESS) return -1;
    if (valOut->result != 0) return -1;

    valOut->keyInfo.dataType = out.keyInfo.dataType;
    valOut->keyInfo.dataSize = size;
    return 0;
}

static int readSMCFloat(io_connect_t conn, const char *key, float *valOut) {
    SMCKeyData_t out;
    char type[5];
    if (readSMCRaw(conn, key, &out, type) != 0) return -1;

    if (strcmp(type, DATATYPE_FLT) == 0 && out.keyInfo.dataSize == 4) {
        memcpy(valOut, out.bytes, 4);
        return 0;
    } else if (strcmp(type, DATATYPE_FPE2) == 0 && out.keyInfo.dataSize == 2) {
        int v = ((unsigned char)out.bytes[0] << 6) | ((unsigned char)out.bytes[1] >> 2);
        *valOut = (float)v;
        return 0;
    } else if (strcmp(type, DATATYPE_UI8) == 0 && out.keyInfo.dataSize == 1) {
        *valOut = (float)(unsigned char)out.bytes[0];
        return 0;
    } else if (strcmp(type, DATATYPE_UI16) == 0 && out.keyInfo.dataSize == 2) {
        *valOut = (float)(((unsigned char)out.bytes[0] << 8) | (unsigned char)out.bytes[1]);
        return 0;
    } else if (strcmp(type, DATATYPE_SP78) == 0 && out.keyInfo.dataSize == 2) {
        int sign = (out.bytes[0] & 0x80) ? -1 : 1;
        int integer = out.bytes[0] & 0x7f;
        float frac = (float)(unsigned char)out.bytes[1] / 256.0f;
        *valOut = (float)(sign * (integer + frac));
        return 0;
    }
    return -1;
}

static int writeSMCKey(io_connect_t conn, const char *keyStr, UInt32 dataType, UInt32 dataSize, const void *bytes) {
    SMCKeyData_t in, out;
    memset(&in, 0, sizeof(in));
    memset(&out, 0, sizeof(out));

    in.key = strToKey(keyStr);
    in.data8 = SMC_CMD_WRITE_BYTES;
    in.keyInfo.dataSize = dataSize;
    in.keyInfo.dataType = dataType;
    memcpy(in.bytes, bytes, dataSize);

    size_t s = sizeof(SMCKeyData_t);
    kern_return_t kr = IOConnectCallStructMethod(conn, KERNEL_INDEX_SMC, &in, s, &out, &s);
    if (kr != KERN_SUCCESS || out.result != 0) return -1;
    return 0;
}

/* Unlock test mode for Apple Silicon (M3/M4/etc.) if required */
static void unlockAppleSiliconTestMode(io_connect_t conn, bool enable) {
    char type[5];
    SMCKeyData_t out;
    if (readSMCRaw(conn, "Ftst", &out, type) == 0) {
        unsigned char val = enable ? 0x01 : 0x00;
        writeSMCKey(conn, "Ftst", out.keyInfo.dataType, 1, &val);
    }
}

static int setFanSpeed(io_connect_t conn, int fanId, float rpm) {
    char keyAc[5], keyMn[5], keyMx[5], keyTg[5], keyMd[5];
    snprintf(keyAc, 5, "F%dAc", fanId);
    snprintf(keyMn, 5, "F%dMn", fanId);
    snprintf(keyMx, 5, "F%dMx", fanId);
    snprintf(keyTg, 5, "F%dTg", fanId);
    snprintf(keyMd, 5, "F%dMd", fanId);

    float minRpm = 0, maxRpm = 0;
    if (readSMCFloat(conn, keyMn, &minRpm) == 0 && minRpm > 0 && rpm < minRpm) {
        rpm = minRpm;
    }
    if (readSMCFloat(conn, keyMx, &maxRpm) == 0 && maxRpm > 0 && rpm > maxRpm) {
        rpm = maxRpm;
    }

    /* Unlock Apple Silicon test mode if necessary */
    unlockAppleSiliconTestMode(conn, true);

    /* 1. Set Fan Mode to manual (F%dMd = 1 or FS! bitmask) */
    char mdType[5];
    SMCKeyData_t mdInfo;
    if (readSMCRaw(conn, keyMd, &mdInfo, mdType) == 0) {
        unsigned char modeVal = 1;
        writeSMCKey(conn, keyMd, mdInfo.keyInfo.dataType, 1, &modeVal);
    }

    /* Also try FS! bitmask for Intel / universal compatibility */
    SMCKeyData_t fsInfo;
    char fsType[5];
    if (readSMCRaw(conn, "FS! ", &fsInfo, fsType) == 0) {
        unsigned short currentBits = ((unsigned char)fsInfo.bytes[0] << 8) | (unsigned char)fsInfo.bytes[1];
        currentBits |= (1 << fanId);
        unsigned char buf[2] = { (unsigned char)(currentBits >> 8), (unsigned char)(currentBits & 0xff) };
        writeSMCKey(conn, "FS! ", fsInfo.keyInfo.dataType, 2, buf);
    }

    /* 2. Write Target Speed (F%dTg) based on its expected type */
    char tgType[5];
    SMCKeyData_t tgInfo;
    if (readSMCRaw(conn, keyTg, &tgInfo, tgType) == 0) {
        if (strcmp(tgType, DATATYPE_FLT) == 0) {
            float fRpm = rpm;
            return writeSMCKey(conn, keyTg, tgInfo.keyInfo.dataType, 4, &fRpm);
        } else if (strcmp(tgType, DATATYPE_FPE2) == 0) {
            int fixed = (int)(rpm * 4.0f);
            unsigned char buf[2] = { (unsigned char)(fixed >> 8), (unsigned char)(fixed & 0xff) };
            return writeSMCKey(conn, keyTg, tgInfo.keyInfo.dataType, 2, buf);
        }
    }

    /* Default fallback: attempt float write */
    float fRpm = rpm;
    return writeSMCKey(conn, keyTg, strToKey(DATATYPE_FLT), 4, &fRpm);
}

static int restoreAutoFan(io_connect_t conn, int fanId) {
    char keyMd[5];
    snprintf(keyMd, 5, "F%dMd", fanId);

    /* 1. Reset F%dMd to 0 */
    char mdType[5];
    SMCKeyData_t mdInfo;
    if (readSMCRaw(conn, keyMd, &mdInfo, mdType) == 0) {
        unsigned char modeVal = 0;
        writeSMCKey(conn, keyMd, mdInfo.keyInfo.dataType, 1, &modeVal);
    }

    /* 2. Clear bit in FS! */
    SMCKeyData_t fsInfo;
    char fsType[5];
    if (readSMCRaw(conn, "FS! ", &fsInfo, fsType) == 0) {
        unsigned short currentBits = ((unsigned char)fsInfo.bytes[0] << 8) | (unsigned char)fsInfo.bytes[1];
        currentBits &= ~(1 << fanId);
        unsigned char buf[2] = { (unsigned char)(currentBits >> 8), (unsigned char)(currentBits & 0xff) };
        writeSMCKey(conn, "FS! ", fsInfo.keyInfo.dataType, 2, buf);
    }

    /* Clear Apple Silicon test mode if all fans auto */
    unlockAppleSiliconTestMode(conn, false);
    return 0;
}

static void printFansJSON(io_connect_t conn) {
    float fanCount = 0;
    if (readSMCFloat(conn, "FNum", &fanCount) != 0 || fanCount < 0) {
        printf("[]");
        return;
    }

    int count = (int)fanCount;
    printf("[");
    for (int i = 0; i < count; i++) {
        char k[5];
        float cur = 0, min = 0, max = 0, tgt = 0, modeVal = 0;
        snprintf(k, 5, "F%dAc", i); readSMCFloat(conn, k, &cur);
        snprintf(k, 5, "F%dMn", i); readSMCFloat(conn, k, &min);
        snprintf(k, 5, "F%dMx", i); readSMCFloat(conn, k, &max);
        snprintf(k, 5, "F%dTg", i); readSMCFloat(conn, k, &tgt);
        snprintf(k, 5, "F%dMd", i); readSMCFloat(conn, k, &modeVal);

        /* Mode: check F%dMd or FS! */
        const char *mode = "auto";
        if (modeVal > 0) {
            mode = "manual";
        } else {
            SMCKeyData_t fsInfo; char fsType[5];
            if (readSMCRaw(conn, "FS! ", &fsInfo, fsType) == 0) {
                unsigned short bits = ((unsigned char)fsInfo.bytes[0] << 8) | (unsigned char)fsInfo.bytes[1];
                if (bits & (1 << i)) mode = "manual";
            }
        }

        if (i > 0) printf(",");
        printf("{\"id\":%d,\"name\":\"Fan %d\",\"currentRpm\":%.1f,\"minRpm\":%.1f,\"maxRpm\":%.1f,\"targetRpm\":%.1f,\"mode\":\"%s\"}",
               i, i, cur, min, max, tgt, mode);
    }
    printf("]");
}

static void printSensorsJSON(io_connect_t smcConn) {
    printf("[");
    bool first = true;

    /* 1. Try IOHIDEventSystemClient (Apple Silicon & modern macOS) */
    IOHIDEventSystemClientRef hidClient = IOHIDEventSystemClientCreate(kCFAllocatorDefault);
    int hidSensorCount = 0;

    if (hidClient) {
        int page = 0xff00;
        int usage = 5;
        CFNumberRef pageNum = CFNumberCreate(kCFAllocatorDefault, kCFNumberIntType, &page);
        CFNumberRef usageNum = CFNumberCreate(kCFAllocatorDefault, kCFNumberIntType, &usage);
        const void *keys[] = { CFSTR("PrimaryUsagePage"), CFSTR("PrimaryUsage") };
        const void *values[] = { pageNum, usageNum };
        CFDictionaryRef dict = CFDictionaryCreate(kCFAllocatorDefault, keys, values, 2, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);

        IOHIDEventSystemClientSetMatching(hidClient, dict);
        CFArrayRef services = IOHIDEventSystemClientCopyServices(hidClient);

        if (services) {
            CFIndex count = CFArrayGetCount(services);
            for (CFIndex i = 0; i < count; i++) {
                IOHIDServiceClientRef service = (IOHIDServiceClientRef)CFArrayGetValueAtIndex(services, i);
                IOHIDEventRef event = IOHIDServiceClientCopyEvent(service, kIOHIDEventTypeTemperature, 0, 0);
                if (event) {
                    double temp = IOHIDEventGetFloatValue(event, IOHIDEventFieldBase(kIOHIDEventTypeTemperature));
                    CFStringRef nameRef = (CFStringRef)IOHIDServiceClientCopyProperty(service, CFSTR("Product"));
                    char nameBuf[128] = "Thermal Sensor";
                    if (nameRef) {
                        CFStringGetCString(nameRef, nameBuf, sizeof(nameBuf), kCFStringEncodingUTF8);
                        CFRelease(nameRef);
                    }

                    /* Filter out unrealistic or empty sensors */
                    if (temp > 0.0 && temp < 130.0) {
                        if (!first) printf(",");
                        printf("{\"id\":\"hid.%ld\",\"name\":\"%s\",\"temperature\":%.1f,\"unit\":\"C\",\"source\":\"hid\",\"available\":true}",
                               i, nameBuf, temp);
                        first = false;
                        hidSensorCount++;
                    }
                    CFRelease(event);
                }
            }
            CFRelease(services);
        }
        CFRelease(dict);
        CFRelease(pageNum);
        CFRelease(usageNum);
        CFRelease(hidClient);
    }

    /* 2. If Intel or fallback, read standard SMC temperature keys */
    if (hidSensorCount == 0 && smcConn) {
        static const struct { const char *key; const char *name; } intelSensors[] = {
            { "TC0P", "CPU Proximity" },
            { "TC0D", "CPU Die" },
            { "TC0E", "CPU Core 0" },
            { "TC0F", "CPU Core 1" },
            { "TC1C", "CPU Core 2" },
            { "TC2C", "CPU Core 3" },
            { "TG0P", "GPU Proximity" },
            { "TG0D", "GPU Die" },
            { "TB0T", "Battery TS_MAX" },
            { "TB1T", "Battery 1" },
            { "TB2T", "Battery 2" },
            { "TM0P", "Memory Proximity" },
            { "TN0P", "Northbridge Proximity" },
            { "Th0H", "Heatpipe 1" },
            { "Ts0P", "Palm Rest" },
            { NULL, NULL }
        };

        for (int i = 0; intelSensors[i].key != NULL; i++) {
            float temp = 0;
            if (readSMCFloat(smcConn, intelSensors[i].key, &temp) == 0 && temp > 0.0f && temp < 130.0f) {
                if (!first) printf(",");
                printf("{\"id\":\"smc.%s\",\"name\":\"%s\",\"temperature\":%.1f,\"unit\":\"C\",\"source\":\"smc\",\"available\":true}",
                       intelSensors[i].key, intelSensors[i].name, temp);
                first = false;
            }
        }
    }

    printf("]");
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: lazymacfan-helper [--json | --fans | --sensors | --set-fan <id> <rpm> | --auto <id> | --auto-all]\n");
        return 1;
    }

    io_connect_t conn = openSMC();
    if (!conn) {
        printf("{\"error\":\"Failed to open AppleSMC service\"}\n");
        return 2;
    }

    if (strcmp(argv[1], "--json") == 0) {
        printf("{\"fans\":");
        printFansJSON(conn);
        printf(",\"sensors\":");
        printSensorsJSON(conn);
        printf("}\n");
    } else if (strcmp(argv[1], "--fans") == 0) {
        printf("{\"fans\":");
        printFansJSON(conn);
        printf("}\n");
    } else if (strcmp(argv[1], "--sensors") == 0) {
        printf("{\"sensors\":");
        printSensorsJSON(conn);
        printf("}\n");
    } else if (strcmp(argv[1], "--set-fan") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Error: --set-fan requires <fanId> <rpm>\n");
            closeSMC(conn);
            return 1;
        }
        int fanId = atoi(argv[2]);
        float rpm = atof(argv[3]);
        int res = setFanSpeed(conn, fanId, rpm);
        if (res == 0) {
            printf("{\"success\":true,\"fanId\":%d,\"targetRpm\":%.1f}\n", fanId, rpm);
        } else {
            printf("{\"success\":false,\"error\":\"Failed to set fan speed\"}\n");
        }
    } else if (strcmp(argv[1], "--auto") == 0) {
        if (argc < 3) {
            fprintf(stderr, "Error: --auto requires <fanId>\n");
            closeSMC(conn);
            return 1;
        }
        int fanId = atoi(argv[2]);
        restoreAutoFan(conn, fanId);
        printf("{\"success\":true,\"fanId\":%d,\"mode\":\"auto\"}\n", fanId);
    } else if (strcmp(argv[1], "--auto-all") == 0) {
        float fanCount = 0;
        if (readSMCFloat(conn, "FNum", &fanCount) == 0 && fanCount > 0) {
            for (int i = 0; i < (int)fanCount; i++) {
                restoreAutoFan(conn, i);
            }
        }
        printf("{\"success\":true,\"mode\":\"auto\"}\n");
    } else {
        fprintf(stderr, "Unknown argument: %s\n", argv[1]);
        closeSMC(conn);
        return 1;
    }

    closeSMC(conn);
    return 0;
}
