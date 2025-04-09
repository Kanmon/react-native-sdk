#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KanmonModule, NSObject)

RCT_EXTERN_METHOD(show:(NSString *)args)
RCT_EXTERN_METHOD(start:(NSString *)url)
RCT_EXTERN_METHOD(stop)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
