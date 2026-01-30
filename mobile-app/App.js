import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Screens
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import VideoRecordScreen from './src/screens/VideoRecordScreen';

import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import VerificationRequiredScreen from './src/screens/VerificationRequiredScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="RoleSelection"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#F9FAFB' }
          }}
        >
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="VerificationRequired" component={VerificationRequiredScreen} />
          <Stack.Screen name="MainTab" component={MainTabNavigator} />
          <Stack.Screen name="VideoRecord" component={VideoRecordScreen} />
          {/* Missing Screens Registered Below */}
          <Stack.Screen name="EmployerDashboard" component={require('./src/screens/EmployerDashboardScreen').default} />
          <Stack.Screen name="PostJob" component={require('./src/screens/PostJobScreen').default} />
          <Stack.Screen name="Chat" component={require('./src/screens/ChatScreen').default} />
          <Stack.Screen name="EmployerProfileCreate" component={require('./src/screens/EmployerProfileCreateScreen').default} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
