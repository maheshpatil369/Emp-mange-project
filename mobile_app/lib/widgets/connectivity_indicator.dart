// lib/widgets/connectivity_indicator.dart
import 'package:flutter/material.dart';
import 'dart:async';
import '../services/connectivity_service.dart';

class ConnectivityIndicator extends StatefulWidget {
  const ConnectivityIndicator({super.key});

  @override
  State<ConnectivityIndicator> createState() => _ConnectivityIndicatorState();
}

class _ConnectivityIndicatorState extends State<ConnectivityIndicator> {
  late StreamSubscription<bool> _connectivitySubscription;
  bool _isOfflineLocal = true;
  String _connectionType = 'Unknown';

  @override
  void initState() {
    super.initState();
    _initializeConnectivity();
  }

  void _initializeConnectivity() async {
    // Get initial state
    _isOfflineLocal = connectivityService.isOffline;
    _connectionType = await connectivityService.getConnectivityType();
    
    if (mounted) {
      setState(() {});
    }

    // Listen to connectivity changes
    _connectivitySubscription = connectivityService.connectivityStream.listen(
      (bool isOffline) {
        if (mounted) {
          setState(() {
            _isOfflineLocal = isOffline;
          });
          _updateConnectionType();
        }
      },
    );
  }

  void _updateConnectionType() async {
    final connectionType = await connectivityService.getConnectivityType();
    if (mounted) {
      setState(() {
        _connectionType = connectionType;
      });
    }
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: _isOfflineLocal ? Colors.red[100] : Colors.green[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isOfflineLocal ? Colors.red : Colors.green,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isOfflineLocal ? Icons.wifi_off : Icons.wifi,
            size: 16,
            color: _isOfflineLocal ? Colors.red[700] : Colors.green[700],
          ),
          const SizedBox(width: 4),
          Text(
            _isOfflineLocal ? 'Offline' : _connectionType,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: _isOfflineLocal ? Colors.red[700] : Colors.green[700],
            ),
          ),
        ],
      ),
    );
  }
}
