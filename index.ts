import { registerRootComponent } from 'expo';

// Background location tasks must be defined before the React tree mounts.
// These imports register the tasks with expo-task-manager at module load time.
import './src/features/tracking/tasks/backgroundLocationTask';
import './src/features/tracking/tasks/workdayBackgroundTask';

// FCM background handler must be registered before the React tree mounts.
import { setBackgroundMessageHandler } from './src/core/notifications/fcm.service';
setBackgroundMessageHandler();

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
