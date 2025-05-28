# @kanmon/react-native-sdk

This provides a simple way to embed Kanmon in a React Native application.

## Installation

```sh
npm install @kanmon/react-native-sdk
```

## iOS Setup

```
cd ios && bundle install && bundle exec pod install
```

Kanmon requires access to the camera for ID Verification. The following will need to be added to `Info.plist` for this to work. Permission will be requested from the user when they see the ID Verification Step.

```
	<key>NSCameraUsageDescription</key>
	<string>This app needs access to the camera to take photos for verification purposes.</string>
```

## Android Setup

Autolinking should automatically detect the new dependency.

Kanmon requires access to the camera for ID Verification. This is declared in the AndroidManifest.xml. Permission will be requested from the user when they see the ID Verification Step.

## Example

Check out the [example](https://github.com/Kanmon/react-native-sdk/blob/main/example/src/App.tsx) integration.

## Additional Documentation

Check out our [documentation](https://kanmon.dev/docs/types) for additional information on the types.
