// lib/providers/data_provider.dart
// import 'dart:nativewrappers/_internal/vm/lib/internal_patch.dart';

import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../helpers/database_helper.dart';
import '../models/member_model.dart';
import 'package:sqflite/sqflite.dart';

class DataProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final DatabaseHelper _databaseHelper = DatabaseHelper();

  // Configuration data structure
  List<Map<String, dynamic>> _fullLocationData = [];
  String? _selectedDistrictSlug;

  // Getters
  List<Map<String, String>> get districts {
    if (_fullLocationData.isEmpty) return [];
    return _fullLocationData.map((loc) {
      return {
        'name': loc['name'] as String,
        'slug': loc['slug'] as String,
      };
    }).toList();
  }

  List<String> get filteredTalukas {
    // Return all talukas if no district is selected
    if (_selectedDistrictSlug == null) {
      return _fullLocationData
          .expand(
              (loc) => (loc['talukas'] as List?)?.cast<String>() ?? <String>[])
          .toList();
    }

    // Find talukas for the selected district
    final selected = _fullLocationData.firstWhere(
      (loc) => loc['slug'] == _selectedDistrictSlug,
      orElse: () => {'talukas': <String>[]},
    );

    return List<String>.from(selected['talukas'] ?? []);
  }

  bool _isLoadingConfig = false;
  bool _isAssigningBundle = false;
  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<Member> _records = [];
  List<Map<String, dynamic>> _serverBundles = [];
  bool _isLoadingRecords = false;

  // Getters
  List<Member> get records => _records;
  List<Map<String, dynamic>> get serverBundles => _serverBundles;
  bool get isLoadingRecords => _isLoadingRecords;
  bool get isLoadingConfig => _isLoadingConfig;
  bool get isAssigningBundle => _isAssigningBundle;

  // Modify the constructor to print database path
  DataProvider() {
    loadConfig();
    // fetchLocalData();
  }

  // Method to be called from the UI when a district is selected
  void selectDistrict(String? districtSlug) {
    _selectedDistrictSlug = districtSlug;
    notifyListeners();
  }

  // To correctly process the API response
  Future<void> loadConfig() async {
    _isLoadingConfig = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final responseData = await _apiService.fetchConfig();

      // Safely extract data with null checks
      final locations = responseData['locations'] ??
          responseData['config']?['locations'] ??
          [];
      final talukasInfo = responseData['talukas'] ?? [];

      // Create a lookup map for talukas by their locationSlug
      final Map<String, List<String>> talukasMap = {};
      for (var talukaGroup in talukasInfo) {
        final slug = talukaGroup['locationSlug'];
        if (slug != null) {
          final talukaList = List<String>.from(talukaGroup['talukas'] ?? []);
          talukasMap[slug] = talukaList;
        }
      }

      // Merge locations with their corresponding talukas
      _fullLocationData = List<Map<String, dynamic>>.from(locations.map((loc) {
        final slug = loc['slug'];
        return {
          'name': loc['name'] ?? '',
          'slug': slug ?? '',
          'talukas': talukasMap[slug] ?? [], // Find talukas using the slug
        };
      }));

      // Set first district as default if available
      if (_fullLocationData.isNotEmpty) {
        _selectedDistrictSlug = _fullLocationData.first['slug'];
      }

      print('Loaded Location Data: $_fullLocationData');
      print('Talukas Map: $talukasMap');
    } catch (e, stackTrace) {
      _errorMessage = 'Failed to load configuration: ${e.toString()}';
      print('Configuration Load Error: $_errorMessage');
      print('Stacktrace: $stackTrace');
      _fullLocationData = [];
    } finally {
      _isLoadingConfig = false;
      notifyListeners();
    }
  }

  Future<void> fetchServerBundles() async {
    try {
      final response = await _apiService.fetchActiveBundles();
      // response is a Map<String, dynamic> where each value is a bundle map
      if (response is Map<String, dynamic>) {
        _serverBundles = response.values
            .map<Map<String, dynamic>>((v) => Map<String, dynamic>.from(v))
            .toList();
      } else {
        _serverBundles = [];
      }
      notifyListeners();
    } catch (e) {
      print('Error fetching server bundles: $e');
      _serverBundles = [];
      notifyListeners();
    }
  }

  // Method to assign work bundle and store locally
  Future<void> assignWorkBundle(String taluka) async {
    _isAssigningBundle = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Ensure taluka is a clean string
      final cleanTaluka = taluka.trim();
      print('Assigning bundle for taluka: $cleanTaluka');

      if (cleanTaluka.isEmpty) {
        throw Exception('Taluka cannot be empty');
      }

      // // Call API to assign bundle
      // final bundleResponse = await _apiService.assignBundle(cleanTaluka);
      //
      // // Parse bundle details from API response
      // final bundleData = {
      //   'bundleNo': bundleResponse['bundle']['bundleNo'],
      //   'taluka': cleanTaluka,
      //   'status': 'active'
      // };
      // print("MNPK");
      // // Store bundle in local db
      // await _databaseHelper.insertBundle(bundleData);
      // print("MNPK12");
      _errorMessage = null;
      print('Bundle assigned and stored successfully for $cleanTaluka');
    } catch (e) {
      _errorMessage = 'Failed to assign bundle: ${e.toString()}';
      print(_errorMessage);
    } finally {
      _isAssigningBundle = false;
      notifyListeners();
    }
  }

  // Method to fetch active bundles from local database
  // Future<List<Map<String, dynamic>>> getLocalBundles() async {
  //   try {
  //     print("Fetching active bundles from local database");
  //     final activeBundles = await _databaseHelper.getActiveLocalBundles();
  //     print("Found ${activeBundles.length} active bundles");
  //     return activeBundles;
  //   } catch (e) {
  //     print('Error fetching active bundles: $e');
  //     return [];
  //   }
  // }

  //number of records in the device locally
  Future<int> getLocalRecordCount() async {
    try {
      final db = await _databaseHelper.database;
      final result =
          await db.rawQuery('SELECT COUNT(*) as count FROM raw_records');
      return Sqflite.firstIntValue(result) ?? 0;
    } catch (e) {
      print('Error getting local record count: $e');
      return 0;
    }
  }

  // Delete ALL existing entries in local database
  Future<void> deleteAllLocalRecords() async {
    try {
      final db = await _databaseHelper.database;
      await db.delete('raw_records');
      notifyListeners();
      print('All local records deleted from raw_records table.');
    } catch (e) {
      print('Error deleting local records: $e');
    }
  }

  Future<void> downloadAndStoreAssignedRecords() async {
    try {
      final records = await _apiService.fetchAssignedFile();
      await _databaseHelper.insertRawRecords(records);
      print('Downloaded and stored ${records.length} records from server.');
      notifyListeners();
    } catch (e) {
      print('Error downloading/storing assigned records: $e');
    }
  }

  // Method to update bundle status
  Future<void> updateBundleStatus(int bundleNo, String status) async {
    try {
      print("Updating bundle $bundleNo status to $status");
      await _databaseHelper.updateBundleStatus(bundleNo, status);
    } catch (e) {
      print('Error updating bundle status: $e');
    }
  }

  // Search through local raw records
  Future<List<Map<String, dynamic>>> searchLocalRecords(String query) async {
    try {
      if (query.trim().isEmpty) {
        return [];
      }
      final results = await _databaseHelper.searchRawRecords(query);
      print('Found ${results.length} records matching "$query"');
      return results;
    } catch (e) {
      print('Error searching local records: $e');
      return [];
    }
  }

  // Modify fetchLocalData to attempt sample record insertion if no records found
  // Future<void> fetchLocalData() async {
  //   _isLoadingRecords = true;
  //   _errorMessage = null;
  //   notifyListeners();

  //   try {
  //     print("GetRecords start");
  //     _records = await _databaseHelper.getLocalRecords();
  //     print("GetRecords end");

  //     // If no records found, try to insert sample records
  //     if (_records.isEmpty) {
  //       print("No records found. Attempting to insert sample records.");
  //     }

  //     _errorMessage = null;
  //     print('Fetched successfully: ${_records.length} records');
  //   } catch (e) {
  //     print('Error fetching local records: ${e.toString()}');
  //     _errorMessage = 'Failed to fetch local data: ${e.toString()}';
  //     _records = []; // Ensure records is an empty list on error
  //   } finally {
  //     print("Printing Done");
  //     _isLoadingRecords = false;
  //     notifyListeners();
  //   }
  // }
}
