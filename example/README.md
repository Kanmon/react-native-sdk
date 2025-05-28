# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

# Features

Initializes Kanmon and provides a CTA to launch Kanmon.

# Set up environment

1. Run `yarn copy-env`. This will create a `.env` file with empty values.
2. Create a business and a user in the sandbox either using API or through our Demo Platform application.
3. Copy the Kanmon user ID and your API key to `.env`. The API key is used to create a [Connect Token](https://kanmon.dev/reference/createconnecttoken) in this example application. The Connect Token is passed as a parameter when initializing the SDK. Note Connect Token creation should not happen on the client side in a production application.

# Install dependencies

Run `yarn`.

# Build and run the app

### Android

1. `cd example`
2. `yarn android`

### iOS

1. `cd example `
2. `bundle install`
3. `cd ios`
4. `bundle exec pod install`
5. `cd ..`
6. `yarn ios`
