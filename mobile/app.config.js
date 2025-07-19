const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_STAGING = process.env.APP_VARIANT === 'staging';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.yieldrails.mobile.dev';
  }
  if (IS_STAGING) {
    return 'com.yieldrails.mobile.staging';
  }
  return 'com.yieldrails.mobile';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'YieldRails (Dev)';
  }
  if (IS_STAGING) {
    return 'YieldRails (Staging)';
  }
  return 'YieldRails';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'yieldrails-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: process.env.IOS_BUILD_NUMBER || '1',
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        NSCameraUsageDescription: 'This app uses camera to scan QR codes for wallet connections',
        NSFaceIDUsageDescription: 'This app uses Face ID for secure authentication',
        NSLocalNetworkUsageDescription: 'This app needs access to local network for development purposes',
        ITSAppUsesNonExemptEncryption: false
      },
      associatedDomains: [
        'applinks:yieldrails.com',
        'applinks:app.yieldrails.com'
      ]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      package: getUniqueIdentifier(),
      versionCode: parseInt(process.env.ANDROID_VERSION_CODE || '1', 10),
      permissions: [
        'android.permission.CAMERA',
        'android.permission.USE_FINGERPRINT',
        'android.permission.USE_BIOMETRIC',
        'android.permission.VIBRATE',
        'android.permission.INTERNET',
        'android.permission.WAKE_LOCK'
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'yieldrails.com'
            },
            {
              scheme: 'https',
              host: 'app.yieldrails.com'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ]
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro'
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
          defaultChannel: 'default'
        }
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow YieldRails to use Face ID for secure authentication'
        }
      ],
      [
        'expo-secure-store'
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow YieldRails to access camera for QR code scanning'
        }
      ],
      [
        'expo-haptics'
      ],
      [
        'expo-linking',
        {
          scheme: 'yieldrails'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || 'your-project-id'
      },
      apiBaseUrl: IS_DEV 
        ? 'http://localhost:3001/api'
        : IS_STAGING
          ? 'https://api-staging.yieldrails.com/api'
          : 'https://api.yieldrails.com/api',
      websocketUrl: IS_DEV
        ? 'ws://localhost:3001/ws'
        : IS_STAGING
          ? 'wss://api-staging.yieldrails.com/ws'
          : 'wss://api.yieldrails.com/ws',
      walletConnectProjectId: process.env.WALLET_CONNECT_PROJECT_ID,
      environment: IS_DEV ? 'development' : IS_STAGING ? 'staging' : 'production'
    },
    owner: 'yieldrails',
    runtimeVersion: {
      policy: 'sdkVersion'
    },
    updates: {
      url: 'https://u.expo.dev/your-project-id'
    }
  }
};