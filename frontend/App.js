import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthProvider, useAuth } from './AuthContext';

// Screens
// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import UploadScreen from './screens/UploadScreen';
import ProfileScreen from './screens/ProfileScreen';
import CollaborationScreen from './screens/CollaborationScreen';

import { AudioProvider } from './AudioContext';
import FloatingPlayer from './components/FloatingPlayer';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Explore': iconName = focused ? 'compass' : 'compass-outline'; break;
            case 'Upload': iconName = focused ? 'plus-circle' : 'plus-circle-outline'; break;
            case 'Collaboration': iconName = focused ? 'account-group' : 'account-group-outline'; break;
            case 'Profile': iconName = focused ? 'account' : 'account-outline'; break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explorar' }} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ title: 'Subir' }} />
      <Tab.Screen name="Collaboration" component={CollaborationScreen} options={{ title: 'Colaborar' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? (
        <React.Fragment>
          <TabNavigator />
          <FloatingPlayer />
        </React.Fragment>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}


// Main App Component

const App = () => {
  return (
    <AuthProvider>
      <AudioProvider>
        <Navigation />
        {/* Floating Player is inside AudioProvider but outside NavigationContainer so it floats? 
            Actually FloatingPlayer needs access to AudioContext. 
            Navigation is inside AudioProvider. 
            We can put FloatingPlayer inside Navigation wrapper or here if positioned absolute.
        */}
      </AudioProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6200ee',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default App;