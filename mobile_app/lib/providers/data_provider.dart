// lib/providers/data_provider.dart
import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../helpers/database_helper.dart';
import '../models/member_model.dart';

class DataProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final DatabaseHelper _databaseHelper = DatabaseHelper();

  // Configuration data structure
  List<Map<String, dynamic>> _locationData = [];
  String? _selectedLocation;

  // Getters
  List<String> get districts =>
      _locationData.map((loc) => loc['name'] as String).toList();
  List<String> get talukas {
    // Convert dynamic list to List<String>
    return _locationData
        .expand(
            (loc) => (loc['talukas'] as List?)?.cast<String>() ?? <String>[])
        .toList();
  }

  String? get selectedLocation => _selectedLocation;
  set selectedLocation(String? location) {
    _selectedLocation = location;
    notifyListeners();
  }

  bool _isLoadingConfig = false;
  bool _isAssigningBundle = false;
  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<Member> _records = [];
  bool _isLoadingRecords = false;

  // Getters
  List<Member> get records => _records;
  bool get isLoadingRecords => _isLoadingRecords;
  bool get isLoadingConfig => _isLoadingConfig;
  bool get isAssigningBundle => _isAssigningBundle;

  DataProvider() {
    loadConfig();
    fetchLocalData();
  }

  Future<void> loadConfig() async {
    _isLoadingConfig = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final config = await _apiService.fetchConfig();

      // Process locations
      if (config['locations'] is List) {
        _locationData = List<Map<String, dynamic>>.from(config['locations'].map(
            (loc) => {
                  'name': loc['name'],
                  'slug': loc['slug'],
                  'talukas': loc['talukas'] ?? []
                }));

        // Set first location as default if available
        if (_locationData.isNotEmpty) {
          _selectedLocation = _locationData.first['name'];
        }
      } else {
        print(
            'Warning: locations is not a List, got ${config['locations'].runtimeType}');
        _locationData = [];
      }

      print('Loaded Location Data: $_locationData');
    } catch (e) {
      _errorMessage = 'Failed to load configuration: ${e.toString()}';
      print(_errorMessage);
      _locationData = [];
    } finally {
      _isLoadingConfig = false;
      notifyListeners();
    }
  }

  Future<void> assignWorkBundle(String taluka) async {
    _isAssigningBundle = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Ensure taluka is a clean string
      final cleanTaluka = taluka.trim();
      print('cleanTaluka: $cleanTaluka');
      if (cleanTaluka.isEmpty) {
        throw Exception('Taluka cannot be empty');
      }

      await _apiService.assignBundle(cleanTaluka);
      _errorMessage = null;
      print('Bundle assigned successfully to $cleanTaluka');
    } catch (e) {
      _errorMessage = 'Failed to assign bundle: ${e.toString()}';
      print(_errorMessage);
    } finally {
      _isAssigningBundle = false;
      notifyListeners();
    }
  }

  // Method to fetch local data
  Future<void> fetchLocalData() async {
    _isLoadingRecords = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final databaseHelper = DatabaseHelper();
      _records = await databaseHelper.getRecords();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Failed to fetch local data: ${e.toString()}';
      _records = []; // Ensure records is an empty list on error
    } finally {
      _isLoadingRecords = false;
      notifyListeners();
    }
  }
}
