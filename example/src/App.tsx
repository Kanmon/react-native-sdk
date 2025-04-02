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
import nativeSdk from '../../src/index'
import { type OnEventCallbackEvent } from '../../src/types/OnEventCallbackEvent.types'
import {
  type ErrorEvent,
  KanmonConnectComponent,
  KanmonConnectEnviroment,
} from '../../src/types/types'

const workflowHostName = 'https://workflow.concar.dev'

// Sub in your test user IDs here
const testUserId1 = 'f1c23cbb-856c-4570-8c72-e176695a5864'
// 2nd test user allows for switching between users.
const testUserId2 = '74ed8bab-a0b3-4f95-8b78-e34401b9c3ac'

// For the sake of testing
const apiKey = 'YOUR_API_KEY'

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
        environment: 'staging' as KanmonConnectEnviroment,
        connectToken: res.data.connectToken,
        onEvent: (event: OnEventCallbackEvent) => {
          console.log('got event', event)
        },
        onError: (error: ErrorEvent) => {
          console.log('error', error)
        },
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('got axios error', error.message)
      }
      console.log('error', error)
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
