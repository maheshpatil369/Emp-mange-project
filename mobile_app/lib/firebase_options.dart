// File generated and updated manually with your new Firebase project keys.
// ignore_for_file: lines_longer_than_80_chars, avoid_classes_with_only_static_members
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
///
/// Example:
/// ```dart
/// import 'firebase_options.dart';
/// // ...
/// await Firebase.initializeApp(
///   options: DefaultFirebaseOptions.currentPlatform,
/// );
/// ```
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  // ✅ Updated with admicentea project keys
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBjHfFomR9EyDRCd8QFPim3mBnwDq7kQLI',
    appId: '1:1024138299279:web:96bc547366bd951e7f2dfa',
    messagingSenderId: '1024138299279',
    projectId: 'admicentea',
    authDomain: 'admicentea.firebaseapp.com',
    storageBucket: 'admicentea.firebasestorage.app',
    databaseURL: 'https://admicentea-default-rtdb.firebaseio.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBjHfFomR9EyDRCd8QFPim3mBnwDq7kQLI',
    appId: '1:1024138299279:android:96bc547366bd951e7f2dfa',
    messagingSenderId: '1024138299279',
    projectId: 'admicentea',
    authDomain: 'admicentea.firebaseapp.com',
    storageBucket: 'admicentea.firebasestorage.app',
    databaseURL: 'https://admicentea-default-rtdb.firebaseio.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBjHfFomR9EyDRCd8QFPim3mBnwDq7kQLI',
    appId: '1:1024138299279:ios:96bc547366bd951e7f2dfa',
    messagingSenderId: '1024138299279',
    projectId: 'admicentea',
    authDomain: 'admicentea.firebaseapp.com',
    storageBucket: 'admicentea.firebasestorage.app',
    databaseURL: 'https://admicentea-default-rtdb.firebaseio.com',
    iosBundleId: 'com.example.mobile_app',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyBjHfFomR9EyDRCd8QFPim3mBnwDq7kQLI',
    appId: '1:1024138299279:macos:96bc547366bd951e7f2dfa',
    messagingSenderId: '1024138299279',
    projectId: 'admicentea',
    authDomain: 'admicentea.firebaseapp.com',
    storageBucket: 'admicentea.firebasestorage.app',
    databaseURL: 'https://admicentea-default-rtdb.firebaseio.com',
    iosBundleId: 'com.example.mobile_app',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyBjHfFomR9EyDRCd8QFPim3mBnwDq7kQLI',
    // ⚠️ Windows ke liye alag App ID generate karna recommended hai
    appId: '1:1024138299279:web:96bc547366bd951e7f2dfa',
    messagingSenderId: '1024138299279',
    projectId: 'admicentea',
    authDomain: 'admicentea.firebaseapp.com',
    storageBucket: 'admicentea.firebasestorage.app',
    databaseURL: 'https://admicentea-default-rtdb.firebaseio.com',
  );
}
