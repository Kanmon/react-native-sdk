# @kanmon/react-native-sdk

Kanmon React Native SDK

## Installation

```sh
npm install @kanmon/react-native-sdk
```

## iOS Setup

```
cd ios && bundle install && bundle exec pod install
```

There are cases where Kanmon will collect ID Verification from the user. It will need access to the camera for this. The following will need to be added to `Info.plist` for this to work.

```
	<key>NSCameraUsageDescription</key>
	<string>This app needs access to the camera to take photos for verification purposes.</string>
```

## Android Setup

Autolinking should automatically detect the new dependency.
