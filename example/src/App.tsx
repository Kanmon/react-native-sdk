import React, { useEffect } from 'react'
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'

import { Colors } from 'react-native/Libraries/NewAppScreen'

import axios from 'axios'
import nativeSdk, {
  KanmonConnectComponent,
  KanmonConnectEnviroment,
  type ErrorEvent,
  type OnEventCallbackEvent,
} from '@kanmon/react-native-sdk'

const workflowHostName = process.env.WORKFLOW_HOST_NAME

// Sub in your test user IDs here
const testUserId1 = process.env.TEST_USER_ID_1 as string
// 2nd test user allows for switching between users.
const testUserId2 = process.env.TEST_USER_ID_2 as string

// For the sake of testing. Do not do this in production.
const apiKey = process.env.KANMON_API_KEY

const environment = process.env.ENVIRONMENT

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark'

  const startKanmon = async (userId: string) => {
    try {
      const res = await axios.post(
        `${workflowHostName}/api/platform/v2/connect-tokens`,
        {
          userId,
        },
        {
          headers: {
            Authorization: `ApiKey ${apiKey}`,
          },
        },
      )

      nativeSdk.start({
        environment: environment as KanmonConnectEnviroment,
        connectToken: res.data.connectToken,
        onEvent: (event: OnEventCallbackEvent) => {
          console.log('got event', event)
        },
        onError: (error: ErrorEvent) => {
          console.error('error', error)
        },
      })
    } catch (error) {
      console.error('error', error)
    }
  }

  useEffect(() => {
    startKanmon(testUserId1)
  }, [])

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        <View
          style={[
            styles.contentContainer,
            {
              backgroundColor: isDarkMode ? Colors.black : Colors.white,
            },
          ]}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Kanmon SDK Example</Text>
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Open Kanmon" onPress={() => nativeSdk.show()} />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Open Legal Docs"
              onPress={() =>
                nativeSdk.show({
                  component: KanmonConnectComponent.DOWNLOAD_AGREEMENTS,
                })
              }
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Start Kanmon with User 1"
              onPress={() => startKanmon(testUserId1)}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Start Kanmon with User 2"
              onPress={() => startKanmon(testUserId2)}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Stop" onPress={() => nativeSdk.stop()} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: '5%',
  },
  headerText: {
    fontSize: 24,
  },
  contentContainer: {
    paddingHorizontal: '5%',
    paddingBottom: '5%',
    paddingTop: '5%',
  },
  buttonContainer: {
    padding: 10,
  },
})

export default App
