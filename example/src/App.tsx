/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

import { Colors, Header } from 'react-native/Libraries/NewAppScreen';

import axios from 'axios';
import nativeSdk from '../../src/index';
import { type OnEventCallbackEvent } from '../../src/types/OnEventCallbackEvent.types';
import {
  type ErrorEvent,
  KanmonConnectComponent,
  KanmonConnectEnviroment,
} from '../../src/types/types';

// const workflowHostName = 'http://10.0.2.2:3333';
// const bizexHostName = 'http://10.0.2.2:4200';
// const userId = '4fe6ed94-79f0-440f-9309-a659c4ffec94';
const platformBusinessId = 'cd4f61d4-6b39-457d-8fea-a5945661eebc';

const workflowHostName = 'https://workflow.concar.dev';
const userId = 'f1c23cbb-856c-4570-8c72-e176695a5864';

const userId2 = '74ed8bab-a0b3-4f95-8b78-e34401b9c3ac';

const getEmbeddedSessionToken = async () => {
  const payload = {
    platformBusinessId,
    data: {
      component: 'SESSION_INVOICE_FLOW',
      invoices: [
        {
          platformInvoiceId: Math.random().toString(36).substring(2, 17),
          payorType: 'BUSINESS',
          platformInvoiceNumber: '123',
          invoiceAmountCents: 10000000,
          invoiceDueDate: '2025-04-15',
          invoiceIssuedDate: '2025-03-15',
          payorBusinessName: 'My Business',
          payorEmail: 'user@gmail.com',
          payorAddress: {
            addressLineOne: 'Line One2',
            city: 'demo-city-1',
            state: 'IN',
            zipcode: '12345+1234',
            country: 'USA',
          },
          description: 'my invoice',
        },
      ],
    },
  };

  const res = await axios.post(
    `${workflowHostName}/api/platform/v2/embedded-session`,
    payload,
    {
      headers: {
        Authorization: 'ApiKey kanmon',
      },
    }
  );

  return res.data.sessionToken;
};

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const launchEmbeddedSession = async () => {
    const sessionToken = await getEmbeddedSessionToken();

    nativeSdk.show({
      sessionToken,
      component: KanmonConnectComponent.SESSION_INVOICE_FLOW,
    });
  };

  const startKanmon = async (userId: string) => {
    try {
      const res = await axios.post(
        `${workflowHostName}/api/platform/v2/connect-tokens`,
        {
          userId,
        },
        {
          headers: {
            Authorization: 'ApiKey kanmon',
          },
        }
      );

      nativeSdk.start({
        environment: 'staging' as KanmonConnectEnviroment,
        connectToken: res.data.connectToken,
        onEvent: (event: OnEventCallbackEvent) => {
          console.log('got event', event);
        },
        onError: (error: ErrorEvent) => {
          console.log('error', error);
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('got axios error', error.message);
      }
      console.log('error', error);
    }
  };

  useEffect(() => {
    console.log('STARTING KANMON HERE???');
    startKanmon(userId);
  }, []);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the reccomendation is to use `react-native-safe-area-context`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = '5%';

  // this will be a public method on RN SDK

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        <View style={{ paddingRight: safePadding }}>
          <Header />
        </View>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
            paddingHorizontal: safePadding,
            paddingBottom: safePadding,
            paddingTop: safePadding,
          }}
        >
          <View style={{ padding: 10 }}>
            <Button title="Open Kanmon" onPress={() => nativeSdk.show()} />
          </View>
          <View style={{ padding: 10 }}>
            <Button
              title="Open Embedded Session"
              onPress={() => launchEmbeddedSession()}
            />
          </View>
          <View style={{ padding: 10 }}>
            <Button
              title="Open Legal Docs"
              onPress={() =>
                nativeSdk.show({
                  component: KanmonConnectComponent.DOWNLOAD_AGREEMENTS,
                })
              }
            />
          </View>
          <View style={{ padding: 10 }}>
            <Button
              title="Start Kanmon with User 1"
              onPress={() => startKanmon(userId)}
            />
          </View>
          <View style={{ padding: 10 }}>
            <Button
              title="Start Kanmon with User 2"
              onPress={() => startKanmon(userId2)}
            />
          </View>
          <View style={{ padding: 10 }}>
            <Button title="Stop" onPress={() => nativeSdk.stop()} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
