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
    print('Fetching districts from fullLocationData');
    return _fullLocationData.map((loc) {
      print('District: ${loc['name']}, Slug: ${loc['slug']}');
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
    print(
        'Filtered talukas for district $_selectedDistrictSlug: ${selected['talukas']}');

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
  List<Map<String, dynamic>> get fullLocationData => _fullLocationData;

  // Modify the constructor to print database path
  DataProvider() {
    loadConfig();
    // fetchLocalData();
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
      // 1. Always load local bundles first for immediate UI display
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      notifyListeners(); // Show local data immediately

      // 2. Try to sync with server in background
      final serverResponse = await _apiService.fetchActiveBundles().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('Server request timed out');
        },
      );

      // If response only contains a 'message', treat as no bundles
      if (serverResponse.containsKey('message') && serverResponse.length == 1) {
        print('No active bundles for user on server.');
        _isOffline = false;
        _isLoadingBundles = false;
        notifyListeners();
        return;
      }

      final serverBundlesList = serverResponse.values
          .map<Map<String, dynamic>>((v) => Map<String, dynamic>.from(v))
          .toList();

      // 3. Sync server data with local data (preserving local counts)
      final localBundles = await _databaseHelper.getActiveLocalBundles();
      final localBundlesMap = {for (var b in localBundles) b['bundleNo']: b};
      final serverBundlesMap = {
        for (var b in serverBundlesList) b['bundleNo']: b
      };

      // 4. Apply changes to the local database (but preserve local counts)
      final bundlesToUpdate = <Map<String, dynamic>>[];
      final bundlesToAdd = <Map<String, dynamic>>[];

      // Check server bundles against local ones
      for (var serverBundle in serverBundlesList) {
        final bundleNo = serverBundle['bundleNo'];
        if (localBundlesMap.containsKey(bundleNo)) {
          // Bundle exists locally - update but preserve local count
          final localBundle = localBundlesMap[bundleNo]!;
          final updatedBundle = Map<String, dynamic>.from(serverBundle);
          updatedBundle['count'] = localBundle['count']; // Preserve local count
          bundlesToUpdate.add(updatedBundle);
        } else {
          // New bundle from server
          bundlesToAdd.add(serverBundle);
        }
      }

      // Apply changes
      for (var bundle in bundlesToAdd) {
        await _databaseHelper.insertBundle(bundle);
      }
      for (var bundle in bundlesToUpdate) {
        await _databaseHelper.updateBundle(bundle);
      }

      // 5. Refresh local state and show updated data
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      _isOffline = false;
      print(
          'Successfully synced bundles with server while preserving local counts.');
    } catch (e) {
      _errorMessage =
          'Failed to sync with server. Showing local data: ${e.toString()}';
      print('Error syncing with server, using local data: $e');
      _isOffline = true;
      // Use local data as fallback
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

  Future<void> deleteAllLocalBundles() async {
    try {
      final db = await _databaseHelper.database;
      await db
          .delete('bundles'); // Replace 'bundles' with your actual table name
      print('All bundles deleted from local database.');
      notifyListeners();
    } catch (e) {
      print('Error deleting bundles: $e');
    }
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
      print("Checking if bundle exists for taluka: $cleanTaluka");
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

  Future<void> refreshLocalBundles() async {
    try {
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      notifyListeners();
      print('Local bundles refreshed for UI display');
    } catch (e) {
      print('Error refreshing local bundles: $e');
    }
  }

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
      print('Fetched ${records.length} records from server.');
      print(" Records: ${records[0]}");

      if (records.isEmpty) {
        return 'No records to download from server.';
      }
      print('Downloading ${records.length} records from server...');

      // NEW LOGIC: Check if any of the fetched records already exist locally
      if (await _databaseHelper.checkIfAnyRecordExists(records)) {
        print('Records are already downloaded (batch detected as duplicate).');
        return 'Records are already downloaded (batch detected as duplicate).';
      }

      await _databaseHelper.insertRawRecords(records);
      print('Records downloaded and stored locally.');
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

  Future<void> incrementBundleCount(String taluka) async {
    try {
      // Get the bundle for the given taluka
      final db = await _databaseHelper.database;
      final result = await db.query(
        'bundles',
        where: 'taluka = ?',
        whereArgs: [taluka],
        limit: 1,
      );
      if (result.isNotEmpty) {
        final bundle = result.first;
        final newCount = ((bundle['count'] ?? 0) as int) + 1;
        await db.update(
          'bundles',
          {'count': newCount},
          where: 'bundleNo = ? AND taluka = ?',
          whereArgs: [bundle['bundleNo'], taluka],
        );
        print(
            'Bundle count incremented for taluka: $taluka, new count: $newCount');
        notifyListeners();
      }
    } catch (e) {
      print('Error incrementing bundle count: $e');
    }
  }

  // Generate unique ID for a record
  Future<String> generateUniqueId(Map<String, dynamic> record) async {
    try {
      final talukaName = record['Taluka']?.toString().trim();
      if (talukaName == null || talukaName.isEmpty) {
        throw Exception('Taluka name is required for generating unique ID');
      }

      // Get taluka and location abbreviations (existing logic)
      final talukaAbbr = _talukaAbbreviations[talukaName];
      if (talukaAbbr == null) {
        throw Exception('No abbreviation found for taluka: $talukaName');
      }

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

      final locationAbbr = _locationAbbreviations[locationSlug];
      if (locationAbbr == null) {
        throw Exception('No abbreviation found for location: $locationSlug');
      }

      // Get current sequence and increment count immediately
      final nextSequence = await _getNextSequenceNumberAndIncrement(talukaName);

      final uniqueId = '$locationAbbr$talukaAbbr$nextSequence';
      print('Generated unique ID: $uniqueId for taluka: $talukaName');

      return uniqueId;
    } catch (e) {
      print('Error generating unique ID: $e');
      rethrow;
    }
  }

  // Get next sequence number for a specific taluka
  // Future<int> _getNextSequenceNumber(String taluka) async {
  //   final db = await _databaseHelper.database;
  //   final result = await db.query(
  //     'bundles',
  //     where: 'taluka = ?',
  //     whereArgs: [taluka],
  //     limit: 1,
  //   );
  //   if (result.isNotEmpty) {
  //     final bundle = result.first;
  //     final bundleNo = (bundle['bundleNo'] ?? 1) as int;
  //     final count = (bundle['count'] ?? 0) as int;
  //     // Sequence number logic: (bundleNo - 1) * 250 + count
  //     return (bundleNo - 1) * 250 + count;
  //   } else {
  //     throw Exception('No bundle found for taluka: $taluka');
  //   }
  // }

// New method that gets sequence and increments count
  Future<int> _getNextSequenceNumberAndIncrement(String taluka) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'bundles',
      where: 'taluka = ? AND status = ?',
      whereArgs: [taluka, 'active'],
      limit: 1,
    );

    if (result.isNotEmpty) {
      final bundle = result.first;
      final bundleNo = (bundle['bundleNo'] ?? 1) as int;
      final currentCount = (bundle['count'] ?? 0) as int;

      print(
          'BEFORE INCREMENT: Bundle $bundleNo, Taluka: $taluka, Count: $currentCount');

      // Calculate sequence number
      final sequenceNumber = (bundleNo - 1) * 250 + currentCount;

      // Increment count immediately in local database
      final updateResult = await db.update(
        'bundles',
        {'count': currentCount + 1},
        where: 'bundleNo = ? AND taluka = ?',
        whereArgs: [bundleNo, taluka],
      );

      print('Local count updated: $updateResult rows affected');

      // Immediately refresh local bundles for UI
      await refreshLocalBundles();

      print(
          'Incremented local count for taluka: $taluka, new count: ${currentCount + 1}');

      return sequenceNumber;
    } else {
      throw Exception('No active bundle found for taluka: $taluka');
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

      // Group records by taluka for proper sync data
      final Map<String, List<Map<String, dynamic>>> recordsByTaluka = {};
      for (final record in records) {
        final taluka = record['Taluka']?.toString() ?? 'Unknown';
        recordsByTaluka.putIfAbsent(taluka, () => []).add(record);
      }

      // Sync each taluka's records separately (or send all together - depends on your API)
      for (final entry in recordsByTaluka.entries) {
        final taluka = entry.key;
        final talukaRecords = entry.value;

        // Get bundle info for this taluka
        final db = await _databaseHelper.database;
        final bundleResult = await db.query(
          'bundles',
          where: 'taluka = ? AND status = ?',
          whereArgs: [taluka, 'active'],
          limit: 1,
        );

        if (bundleResult.isNotEmpty) {
          final bundle = bundleResult.first;
          final syncData = {
            'taluka': taluka,
            'bundleNo': bundle['bundleNo'],
            'sourceFile': 'mobile_app_processed',
            'records': talukaRecords,
          };

          print('Syncing ${talukaRecords.length} records for taluka: $taluka');
          final success = await _apiService.syncProcessedRecords(syncData);

          if (!success) {
            print('Failed to sync records for taluka: $taluka');
            return false;
          }
        }
      }

      // Clear temp table only if all syncs were successful
      await _databaseHelper.clearRecordsToSync();
      notifyListeners();
      print('All records synced successfully and temporary table cleared');
      return true;
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
