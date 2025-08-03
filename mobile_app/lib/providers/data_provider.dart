// lib/providers/data_provider.dart
// import 'dart:nativewrappers/_internal/vm/lib/internal_patch.dart';

import 'dart:async';
import 'dart:convert';
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

  final List<Member> _records = [];
  List<Map<String, dynamic>> _serverBundles = [];
  bool _isLoadingBundles = false;
  bool _isOffline = false;
  final bool _isLoadingRecords = false;

  // Getters
  List<Member> get records => _records;
  List<Map<String, dynamic>> get serverBundles => _serverBundles;
  bool get isLoadingRecords => _isLoadingRecords;
  bool get isLoadingConfig => _isLoadingConfig;
  bool get isAssigningBundle => _isAssigningBundle;
  bool get isLoadingBundles => _isLoadingBundles;
  bool get isOffline => _isOffline;

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

  Future<void> fetchAndSyncBundles() async {
    _isLoadingBundles = true;
    _errorMessage = null;
    _isOffline = false;
    notifyListeners();

    try {
      // 1. Attempt to fetch from server
      final serverResponse = await _apiService.fetchActiveBundles().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('Server request timed out');
        },
      );
      final serverBundlesList = serverResponse.values
          .map<Map<String, dynamic>>((v) => Map<String, dynamic>.from(v))
          .toList();

      // 2. Fetch local bundles for comparison
      final localBundles = await _databaseHelper.getActiveLocalBundles();
      final localBundlesMap = {for (var b in localBundles) b['bundleNo']: b};
      final serverBundlesMap = {
        for (var b in serverBundlesList) b['bundleNo']: b
      };

      // 3. Determine bundles to add, update, or delete
      final bundlesToUpdate = <Map<String, dynamic>>[];
      final bundlesToAdd = <Map<String, dynamic>>[];
      final bundlesToDelete = <Map<String, dynamic>>[];

      // Check server bundles against local ones
      for (var serverBundle in serverBundlesList) {
        final bundleNo = serverBundle['bundleNo'];
        if (localBundlesMap.containsKey(bundleNo)) {
          bundlesToUpdate.add(serverBundle);
        } else {
          bundlesToAdd.add(serverBundle);
        }
      }

      // Check local bundles against server ones
      for (var localBundle in localBundles) {
        final bundleNo = localBundle['bundleNo'];
        if (!serverBundlesMap.containsKey(bundleNo)) {
          bundlesToDelete.add(localBundle);
        }
      }

      // 4. Apply changes to the local database
      for (var bundle in bundlesToAdd) {
        await _databaseHelper.insertBundle(bundle);
      }
      for (var bundle in bundlesToUpdate) {
        await _databaseHelper.updateBundle(bundle);
      }
      for (var bundle in bundlesToDelete) {
        await _databaseHelper.updateBundleStatus(bundle['bundleNo'], 'deleted');
      }

      // 5. Refresh local state from the database and notify listeners
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      _isOffline = false;
      print('Successfully synced bundles with server.');
    } catch (e) {
      _errorMessage =
          'Failed to sync with server. Loading local data: ${e.toString()}';
      print('Error fetching from server, loading from local DB: $e');
      _isOffline = true;
      // Fallback: load bundles from the local database
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
    } finally {
      _isLoadingBundles = false;
      notifyListeners();
    }
  }

  // The original fetchServerBundles is now replaced by the logic in fetchAndSyncBundles
  Future<void> fetchServerBundles() async {
    await fetchAndSyncBundles();
  }

  // Method to assign work bundle and store locally
  Future<String> assignWorkBundle(String taluka) async {
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

      // Check if a bundle for this taluka already exists
      if (await _apiService
          .fetchActiveBundles()
          .then((bundles) => bundles.containsKey(cleanTaluka))) {
        return ('Bundle already exists for this taluka');
      }
      // Call API to assign bundle
      final bundleResponse = await _apiService.assignBundle(cleanTaluka);

      // Parse bundle details from API response
      final bundleData = {
        'bundleNo': bundleResponse['bundle']['bundleNo'],
        'taluka': cleanTaluka,
        'status': 'active'
      };
      // Store bundle in local db
      await _databaseHelper.insertBundle(bundleData);
      _errorMessage = null;
      print('Bundle assigned and stored successfully for $cleanTaluka');
      return 'Bundle assigned successfully for $cleanTaluka';
    } catch (e) {
      _errorMessage = 'Failed to assign bundle: ${e.toString()}';
      print(_errorMessage);
      return _errorMessage.toString();
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

  Future<String> downloadAndStoreAssignedRecords() async {
    try {
      final records = await _apiService.fetchAssignedFile();

      if (records.isEmpty) {
        return 'No records to download from server.';
      }

      // NEW LOGIC: Check if any of the fetched records already exist locally
      if (await _databaseHelper.checkIfAnyRecordExists(records)) {
        return 'Records are already downloaded (batch detected as duplicate).';
      }

      await _databaseHelper.insertRawRecords(records);
      notifyListeners();
      return 'Records downloaded and stored locally!';
    } catch (e) {
      print('Error downloading/storing assigned records: $e');
      return 'Failed to download records: ${e.toString()}';
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

  // Search through local raw records by "Search from" field with partial matching
  Future<List<Map<String, dynamic>>> searchLocalRecords(String query) async {
    try {
      if (query.trim().isEmpty) {
        return [];
      }

      final cleanQuery = query.trim();
      final results = await _databaseHelper.searchRawRecords(cleanQuery);
      print(
          'Found ${results.length} records containing "$cleanQuery" in "Search from" field');
      return results;
    } catch (e) {
      print('Error searching local records: $e');
      return [];
    }
  }

  // Hardcoded mappings for location and taluka abbreviations
  static const Map<String, String> _locationAbbreviations = {
    'ahilyanagar': 'AN',
    'chhatrapati-sambhajinagar': 'CS',
  };

  static const Map<String, String> _talukaAbbreviations = {
    // Ahilyanagar talukas
    'Ahmednagar': 'AH',
    'Jamkhed': 'JA',
    'Karjat': 'KA',
    'Kopargaon': 'KO',
    'Nevasa': 'NE',
    'Parner': 'PA',
    'Pathardi': 'PT',
    'Rahata': 'RA',
    'Rahuri': 'RH',
    'Sangamner': 'SA',
    'Shevgaon': 'SH',
    'Shirdi': 'SI',
    'Shrigonda': 'SR',
    'Akole': 'AK',

    // Chhatrapati Sambhajinagar talukas
    'Aurangabad': 'AU',
    'Gangapur': 'GA',
    'Kannad': 'KN',
    'Khultabad': 'KH',
    'Paithan': 'PA',
    'Sillod': 'SI',
    'Vaijapur': 'VA',
    'Phulambri': 'PH',
    'Soegaon': 'SO',
  };

  // Generate unique ID for a record
  Future<String> generateUniqueId(Map<String, dynamic> record) async {
    try {
      final talukaName = record['Taluka']?.toString().trim();
      if (talukaName == null || talukaName.isEmpty) {
        throw Exception('Taluka name is required for generating unique ID');
      }

      // Get taluka abbreviation
      final talukaAbbr = _talukaAbbreviations[talukaName];
      if (talukaAbbr == null) {
        throw Exception('No abbreviation found for taluka: $talukaName');
      }

      // Find location for this taluka using the config data
      String? locationSlug;
      for (final location in _fullLocationData) {
        final talukas = List<String>.from(location['talukas'] ?? []);
        if (talukas.contains(talukaName)) {
          locationSlug = location['slug'];
          break;
        }
      }

      if (locationSlug == null) {
        throw Exception('Location not found for taluka: $talukaName');
      }

      // Get location abbreviation
      final locationAbbr = _locationAbbreviations[locationSlug];
      if (locationAbbr == null) {
        throw Exception('No abbreviation found for location: $locationSlug');
      }

      // Find next sequence number for this taluka
      final nextSequence =
          await _getNextSequenceNumber(locationAbbr, talukaAbbr);

      // Generate unique ID
      final uniqueId = '$locationAbbr$talukaAbbr$nextSequence';
      print('Generated unique ID: $uniqueId for taluka: $talukaName');

      // Store the unique ID in permanent storage
      // final searchFromValue = record['Search from'] ??
      //     record['Search From'] ??
      //     record['search from'];
      // if (searchFromValue != null) {
      //   await _databaseHelper.updateRecordWithUniqueId(
      //       searchFromValue.toString(), uniqueId);
      // }

      return uniqueId;
    } catch (e) {
      print('Error generating unique ID: $e');
      rethrow;
    }
  }

  // Get next sequence number for a specific taluka
  Future<int> _getNextSequenceNumber(
      String locationAbbr, String talukaAbbr) async {
    try {
      print(
          '=== DEBUG: Getting next sequence for $locationAbbr$talukaAbbr ===');

      // Get all existing records from local database
      final allRecords = await _databaseHelper.getAllRawRecords();
      print('DEBUG: Found ${allRecords.length} records in raw_records table');

      // Get all records from temporary sync table
      final tempRecords = await _databaseHelper.getRecordsToSync();
      print(
          'DEBUG: Found ${tempRecords.length} records in records_to_sync table');

      // Filter records that have the same location and taluka pattern
      final pattern = RegExp('^$locationAbbr$talukaAbbr\\d+\$');
      final existingIds = <int>{};

      // Check records in raw_records table
      for (final record in allRecords) {
        final recordData =
            json.decode(record['data'] as String) as Map<String, dynamic>;
        final uniqueId = recordData['UniqueId']?.toString();

        if (uniqueId != null && pattern.hasMatch(uniqueId)) {
          // Extract sequence number from existing ID
          final sequenceStr = uniqueId.substring(4); // Remove XXYY part
          final sequence = int.tryParse(sequenceStr);
          if (sequence != null) {
            existingIds.add(sequence);
            print(
                'DEBUG: Found existing ID in raw_records: $uniqueId (sequence: $sequence)');
          }
        }
      }

      // Check records in records_to_sync table
      for (final record in tempRecords) {
        final uniqueId = record['UniqueId']?.toString();

        if (uniqueId != null && pattern.hasMatch(uniqueId)) {
          // Extract sequence number from existing ID
          final sequenceStr = uniqueId.substring(4); // Remove XXYY part
          final sequence = int.tryParse(sequenceStr);
          if (sequence != null) {
            existingIds.add(sequence);
            print(
                'DEBUG: Found existing ID in records_to_sync: $uniqueId (sequence: $sequence)');
          }
        }
      }

      final sortedIds = existingIds.toList()..sort();
      print('DEBUG: All existing sequences (unique): $sortedIds');

      // Find next available sequence number
      if (sortedIds.isEmpty) {
        print('DEBUG: No existing sequences found, returning 1');
        return 1;
      }

      int nextSequence = 1;

      for (final existingSequence in sortedIds) {
        if (existingSequence == nextSequence) {
          nextSequence++;
        } else {
          break;
        }
      }

      print('DEBUG: Next available sequence: $nextSequence');
      return nextSequence;
    } catch (e) {
      print('Error getting next sequence number: $e');
      return 1; // Default to 1 if error occurs
    }
  }

  // Save record to temporary sync table
  Future<bool> saveRecordToSync(Map<String, dynamic> record) async {
    try {
      final success_temp = await _databaseHelper.saveRecordToSync(record);
      final success_permanent = await _databaseHelper.updateRecordWithUniqueId(
          record['Search from'], record['UniqueId'] ?? record['UniqueId']);
      if (success_temp && success_permanent) {
        notifyListeners();
      }
      return success_temp && success_permanent;
    } catch (e) {
      print('Error saving record to sync: $e');
      return false;
    }
  }

  // Get records from temporary sync table
  Future<List<Map<String, dynamic>>> getRecordsToSync() async {
    try {
      return await _databaseHelper.getRecordsToSync();
    } catch (e) {
      print('Error getting records to sync: $e');
      return [];
    }
  }

  // Get count of records in temporary sync table
  Future<int> getRecordsToSyncCount() async {
    try {
      return await _databaseHelper.getRecordsToSyncCount();
    } catch (e) {
      print('Error getting records to sync count: $e');
      return 0;
    }
  }

  // Sync records to server
  Future<bool> syncRecordsToServer() async {
    try {
      final records = await _databaseHelper.getRecordsToSync();

      if (records.isEmpty) {
        print('No records to sync');
        return false;
      }

      final syncData = {
        'taluka': 'TestTaluka',
        'bundleNo': 1,
        'sourceFile': '...',
        'records': records,
      };

      print('Syncing ${records.length} records to server...');
      final success = await _apiService.syncProcessedRecords(syncData);

      if (success) {
        // Clear the temporary table only if sync was successful
        await _databaseHelper.clearRecordsToSync();
        notifyListeners();
        print('Records synced successfully and temporary table cleared');
      } else {
        print('Failed to sync records to server');
      }

      return success;
    } catch (e) {
      print('Error syncing records to server: $e');
      return false;
    }
  }

  // Empty temporary table manually
  Future<bool> emptyTempTable() async {
    try {
      await _databaseHelper.clearRecordsToSync();
      notifyListeners();
      print('Temporary table emptied manually');
      return true;
    } catch (e) {
      print('Error emptying temp table: $e');
      return false;
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
