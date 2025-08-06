// lib/services/connectivity_service.dart
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  
  // Global connectivity state
  bool _isOffline = true;
  
  // Stream controller for connectivity changes
  final StreamController<bool> _connectivityController = StreamController<bool>.broadcast();
  
  /// Get the current offline status
  bool get isOffline => _isOffline;
  
  /// Get the current online status
  bool get isOnline => !_isOffline;
  
  /// Stream of connectivity changes (true = offline, false = online)
  Stream<bool> get connectivityStream => _connectivityController.stream;
  
  /// Initialize the connectivity service
  Future<void> initialize() async {
    // Check initial connectivity status
    await _updateConnectivityStatus();
    
    // Listen to connectivity changes
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (ConnectivityResult result) async {
        await _updateConnectivityStatus();
      },
    );
  }
  
  /// Update the connectivity status based on current connection
  Future<void> _updateConnectivityStatus() async {
    try {
      final ConnectivityResult result = await _connectivity.checkConnectivity();
      final bool wasOffline = _isOffline;
      
      // Determine if device is offline
      _isOffline = result == ConnectivityResult.none;
      
      // Notify listeners only if status changed
      if (wasOffline != _isOffline) {
        _connectivityController.add(_isOffline);
        print('Connectivity changed: ${_isOffline ? 'OFFLINE' : 'ONLINE'}');
      }
    } catch (e) {
      print('Error checking connectivity: $e');
      // Default to offline if we can't check connectivity
      if (!_isOffline) {
        _isOffline = true;
        _connectivityController.add(_isOffline);
      }
    }
  }
  
  /// Manually refresh connectivity status
  Future<void> refreshConnectivityStatus() async {
    await _updateConnectivityStatus();
  }
  
  /// Check if device has internet connectivity (more reliable than just checking connection)
  Future<bool> hasInternetConnection() async {
    try {
      final result = await _connectivity.checkConnectivity();
      if (result == ConnectivityResult.none) {
        return false;
      }
      
      // You can add additional checks here like pinging a server
      // For now, we'll assume connection means internet access
      return true;
    } catch (e) {
      print('Error checking internet connection: $e');
      return false;
    }
  }
  
  /// Get connectivity type as string for debugging
  Future<String> getConnectivityType() async {
    try {
      final result = await _connectivity.checkConnectivity();
      switch (result) {
        case ConnectivityResult.wifi:
          return 'WiFi';
        case ConnectivityResult.mobile:
          return 'Mobile Data';
        case ConnectivityResult.ethernet:
          return 'Ethernet';
        case ConnectivityResult.bluetooth:
          return 'Bluetooth';
        case ConnectivityResult.vpn:
          return 'VPN';
        case ConnectivityResult.other:
          return 'Other';
        case ConnectivityResult.none:
          return 'No Connection';
      }
    } catch (e) {
      return 'Unknown';
    }
  }
  
  /// Dispose of the service and clean up resources
  void dispose() {
    _connectivitySubscription?.cancel();
    _connectivityController.close();
  }
}

/// Global instance of connectivity service
final ConnectivityService connectivityService = ConnectivityService();

/// Global function to check if device is offline
bool get isOffline => connectivityService.isOffline;

/// Global function to check if device is online
bool get isOnline => connectivityService.isOnline;

/// Global function to refresh connectivity status
Future<void> refreshConnectivity() => connectivityService.refreshConnectivityStatus();

/// Global function to get connectivity type
Future<String> getConnectivityType() => connectivityService.getConnectivityType();
