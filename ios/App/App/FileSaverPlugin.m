#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FileSaverPlugin, "FileSaver",
    CAP_PLUGIN_METHOD(saveFile, CAPPluginReturnPromise);
)
