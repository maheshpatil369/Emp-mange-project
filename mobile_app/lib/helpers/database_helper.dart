import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite/sqflite.dart';
import '../models/member_model.dart';
import 'dart:convert';

// Custom exception for database-related errors
class DatabaseOperationException implements Exception {
  final String message;

  DatabaseOperationException(this.message);

  @override
  String toString() => 'DatabaseOperationException: $message';
}

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  static Database? _database;

  // Increment database version to trigger new upgrade
  static const int _databaseVersion = 3;

  // Get the full path of the database
  Future<String> getDatabasePath() async {
    final path = join(await getDatabasesPath(), 'emp_management.db');
    print('Full Database Path: $path');
    return path;
  }

  // Modify database getter to log path
  Future<Database> get database async {
    try {
      if (_database != null) return _database!;

      // Log the database path before opening
      final databasePath = await getDatabasePath();
      print('Attempting to open database at: $databasePath');

      // Platform-specific database initialization
      if (kIsWeb) {
        // Web platform
        sqfliteFfiInit();
        _database = await databaseFactoryFfi.openDatabase(
          join(await getDatabasesPath(), 'emp_management.db'),
          options: OpenDatabaseOptions(
            version: _databaseVersion,
            onCreate: _onCreate,
            onUpgrade: _onUpgrade,
          ),
        );
      } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
        // Desktop platforms
        sqfliteFfiInit();
        _database = await databaseFactoryFfi.openDatabase(
          join(await getDatabasesPath(), 'emp_management.db'),
          options: OpenDatabaseOptions(
            version: _databaseVersion,
            onCreate: _onCreate,
            onUpgrade: _onUpgrade,
          ),
        );
      } else if (Platform.isAndroid) {
        // Explicit Android handling
        String path = join(await getDatabasesPath(), 'emp_management.db');
        _database = await openDatabase(
          path,
          version: _databaseVersion,
          onCreate: _onCreate,
          onUpgrade: _onUpgrade,
          // Add additional options for Android
          singleInstance: true,
        );
      } else if (Platform.isIOS) {
        // iOS-specific handling
        String path = join(await getDatabasesPath(), 'emp_management.db');
        _database = await openDatabase(
          path,
          version: _databaseVersion,
          onCreate: _onCreate,
          onUpgrade: _onUpgrade,
        );
      } else {
        throw UnsupportedError(
            'Platform not supported for database initialization');
      }

      return _database!;
    } catch (e) {
      print('Database initialization error: $e');
      throw Exception('Failed to initialize database');
    }
  }

  // Handle database upgrades
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    print('Upgrading database from $oldVersion to $newVersion');

    // Add migration steps if needed
    if (oldVersion < 3) {
      // Create bundles table if it doesn't exist
      await db.execute('''
        CREATE TABLE IF NOT EXISTS bundles(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bundleNo INTEGER,
          taluka TEXT,
          assignedAt TEXT,
          status TEXT DEFAULT 'active'
        )
      ''');
      print('Bundles table created during upgrade');
      // Add 'count' column if upgrading from a version without it
      await db.execute('ALTER TABLE bundles ADD COLUMN count INTEGER');
      print('Added count column to bundles table');
    }
  }

  // Table creation logic
  Future<void> _onCreate(Database db, int version) async {
    try {
      // Members table
      // await db.execute('''
      //     CREATE TABLE members(
      //       id TEXT PRIMARY KEY,
      //       name TEXT,
      //       taluka TEXT
      //     )
      //   ''');
      // print('Members table created successfully');

      // Bundles table
      await db.execute('''
        CREATE TABLE bundles(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bundleNo INTEGER,
          taluka TEXT,
          assignedAt TEXT,
          status TEXT DEFAULT 'active',
          count INTEGER
        )
      ''');
      print('Bundles table created successfully');

      // Add this new table for raw records
      await db.execute('''
        CREATE TABLE raw_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT
        )
      ''');
      print('Raw records table created successfully');

      // Temp sync table
      await db.execute('''
        CREATE TABLE records_to_sync (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT
        )
      ''');
      print('Records to sync table created successfully');
    } catch (e) {
      print('Error creating tables: $e');
      rethrow;
    }
  }

  // Saare records local database se fetch karne ke liye (for DataScreen)
  // Future<List<Member>> getLocalRecords() async {
  //   try {
  //     final db = await database;
  //     final List<Map<String, dynamic>> maps = await db.query('members');
  //     // Query results (maps) ko List<Member> objects mein convert karein
  //     return List.generate(maps.length, (i) {
  //       return Member.fromMap(maps[i]);
  //     });
  //   } catch (e) {
  //     print('Error fetching records: $e');
  //     rethrow;
  //   }
  // }

  // Insert a new bundle
  Future<int> insertBundle(Map<String, dynamic> bundleData) async {
    try {
      print("Attempting to insert bundle: $bundleData");
      final db = await database;
      // Verify database is open
      if (!db.isOpen) {
        throw DatabaseOperationException('Database is not open');
      }
      // Check if bundles table exists
      final tableExists = await db.rawQuery(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='bundles'");
      if (tableExists.isEmpty) {
        // Attempt to create table if it doesn't exist
        await db.execute('''
          CREATE TABLE IF NOT EXISTS bundles(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bundleNo INTEGER,
            taluka TEXT,
            assignedAt TEXT,
            status TEXT DEFAULT 'active',
            count INTEGER
          )
        ''');
        print('Bundles table created on-the-fly');
      }
      // Prepare bundle data
      final bundleToInsert = {
        'bundleNo': bundleData['bundleNo'],
        'taluka': bundleData['taluka'],
        'assignedAt': DateTime.now().toIso8601String(),
        'status': bundleData['status'] ?? 'active',
        'count': bundleData['count'] ?? 0, // Default to 0 if not provided
      };
      // Validate required fields
      if (bundleToInsert['bundleNo'] == null ||
          bundleToInsert['taluka'] == null) {
        throw DatabaseOperationException(
            'Bundle number and taluka are required');
      }
      final insertResult = await db.insert(
        'bundles',
        bundleToInsert,
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      print("Bundle inserted successfully. Row ID: $insertResult");
      return insertResult;
    } catch (e, stackTrace) {
      print('Error inserting bundle: $e');
      print('Stacktrace: $stackTrace');
      // Additional diagnostic information
      try {
        final db = await database;
        final tables = await db
            .rawQuery("SELECT name FROM sqlite_master WHERE type='table'");
        print('Existing tables: $tables');
      } catch (diagnosisError) {
        print('Additional diagnosis failed: $diagnosisError');
      }
      rethrow;
    }
  }

  // NEW METHOD: Update an existing bundle in the database
  Future<int> updateBundle(Map<String, dynamic> bundleData) async {
    final db = await database;
    final bundleNo = bundleData['bundleNo'];

    // Get current local bundle to preserve count
    final currentBundle = await db.query(
      'bundles',
      where: 'bundleNo = ?',
      whereArgs: [bundleNo],
      limit: 1,
    );

    // Only update the fields that exist in the table and are present in the response.
    final Map<String, dynamic> updateFields = {};

    if (bundleData.containsKey('taluka')) {
      updateFields['taluka'] = bundleData['taluka'];
    }

    // Preserve local count if it exists, otherwise use server count
    if (currentBundle.isNotEmpty && currentBundle.first['count'] != null) {
      updateFields['count'] = currentBundle.first['count']; // Keep local count
      print(
          'Preserving local count: ${currentBundle.first['count']} for bundle $bundleNo');
    } else if (bundleData.containsKey('count')) {
      updateFields['count'] =
          bundleData['count']; // Use server count if no local count
    }

    if (bundleData.containsKey('status')) {
      updateFields['status'] = bundleData['status'];
    }

    // Ensure there are fields to update before calling the database.
    if (updateFields.isEmpty) {
      print("No fields to update for bundle $bundleNo.");
      return 0;
    }

    final result = await db.update(
      'bundles',
      updateFields,
      where: 'bundleNo = ?',
      whereArgs: [bundleNo],
    );

    print("Updated bundle $bundleNo with fields: $updateFields");
    return result;
  }

  Future<void> insertRawRecords(List<Map<String, dynamic>> records) async {
    final db = await database;
    // Create table if not exists
    await db.execute('''
      CREATE TABLE IF NOT EXISTS raw_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT
      )
    ''');
    // Insert each record as a JSON string
    for (final record in records) {
      await db.insert(
        'raw_records',
        {'data': json.encode(record)},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    print('Inserted ${records.length} raw records into local database.');
  }

  // Fetch all active bundles
  Future<List<Map<String, dynamic>>> getActiveLocalBundles() async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> bundles = await db.query('bundles',
          where: 'status = ?',
          whereArgs: ['active'],
          orderBy: 'bundleNo ASC' // Add ordering for consistency
          );

      print(
          "Fetched ${bundles.length} active bundles with current counts:"); // DEBUG
      for (var bundle in bundles) {
        print(
            "Bundle ${bundle['bundleNo']}: Taluka=${bundle['taluka']}, Count=${bundle['count']}"); // DEBUG
      }

      return bundles;
    } catch (e) {
      print('Error fetching active bundles: $e');
      rethrow;
    }
  }

  // Update bundle status
  Future<int> updateBundleStatus(int bundleNo, String status) async {
    try {
      final db = await database;
      final updateResult = await db.update('bundles', {'status': status},
          where: 'bundleNo = ?', whereArgs: [bundleNo]);

      print("Updated bundle $bundleNo with status $status");
      return updateResult;
    } catch (e) {
      print('Error updating bundle status: $e');
      rethrow;
    }
  }

  // Search through raw records by "Search from" field with partial matching
  Future<List<Map<String, dynamic>>> searchRawRecords(String query) async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> results = await db.rawQuery('''
        SELECT data FROM raw_records 
        WHERE data LIKE ?
      ''', ['%"Search from"%$query%']);

      // Parse JSON data back to Map and filter by partial "Search from" match
      final List<Map<String, dynamic>> filteredResults = [];

      for (final row in results) {
        final jsonData = row['data'] as String;
        final record = json.decode(jsonData) as Map<String, dynamic>;

        // Check for "Search from" field with different possible variations
        final searchFromKeys = ["Search from", "Search From", "search from"];
        bool isMatch = false;

        for (final key in searchFromKeys) {
          if (record.containsKey(key)) {
            final searchFromValue = record[key]?.toString().trim();
            if (searchFromValue != null &&
                searchFromValue.contains(query.trim())) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          filteredResults.add(record);
        }
      }

      return filteredResults;
    } catch (e) {
      print('Error searching raw records: $e');
      return [];
    }
  }

  // Get all raw records from local database
  Future<List<Map<String, dynamic>>> getAllRawRecords() async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> results = await db.rawQuery('''
        SELECT data FROM raw_records
      ''');

      return results;
    } catch (e) {
      print('Error getting all raw records: $e');
      return [];
    }
  }

  Future<bool> checkIfAnyRecordExists(
      List<Map<String, dynamic>> records) async {
    if (records.isEmpty) {
      return false;
    }
    final db = await database;
    try {
      // Get all existing records from the local database
      final List<Map<String, dynamic>> localRecords = await getAllRawRecords();
      final Set<String> localSearchFromValues = {};

      // Populate a set with "Search from" values from local records for quick lookup
      for (var localRecordJson in localRecords) {
        final localRecord = json.decode(localRecordJson['data'] as String)
            as Map<String, dynamic>;
        final searchFromValue = localRecord['Search from'] ??
            localRecord['Search From'] ??
            localRecord['search from'];
        if (searchFromValue != null) {
          localSearchFromValues.add(searchFromValue.toString());
        }
      }

      // Check if any of the incoming records' "Search from" values exist in the local set
      for (var incomingRecord in records) {
        final searchFromValue = incomingRecord['Search from'] ??
            incomingRecord['Search From'] ??
            incomingRecord['search from'];
        if (searchFromValue != null &&
            localSearchFromValues.contains(searchFromValue.toString())) {
          print(
              'Found a duplicate record with "Search from": $searchFromValue');
          return true; // Found a duplicate, so the batch is considered already downloaded
        }
      }
      return false; // No duplicates found in the incoming batch
    } catch (e) {
      print('Error checking for existing records: $e');
      // In case of error, assume no duplicates to allow download, or handle as per desired error policy
      return false;
    }
  }

  // Create records_to_sync table
  Future<void> _createRecordsToSyncTable(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS records_to_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT
      )
    ''');
  }

  // Save record to temporary sync table
  Future<bool> saveRecordToSync(Map<String, dynamic> record) async {
    try {
      final db = await database;

      // Create table if not exists
      await _createRecordsToSyncTable(db);

      // Check if we're at the limit (250 records)
      final countResult =
          await db.rawQuery('SELECT COUNT(*) as count FROM records_to_sync');
      final currentCount = Sqflite.firstIntValue(countResult) ?? 0;

      if (currentCount >= 250) {
        print('Temporary sync table is full (250 records limit)');
        return false;
      }

      // Insert the record
      await db.insert(
        'records_to_sync',
        {'data': json.encode(record)},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      print(
          'Record saved to temporary sync table. Total records: ${currentCount + 1}');
      return true;
    } catch (e) {
      print('Error saving record to sync table: $e');
      return false;
    }
  }

  // Get all records from temporary sync table
  Future<List<Map<String, dynamic>>> getRecordsToSync() async {
    try {
      final db = await database;
      await _createRecordsToSyncTable(db);

      final List<Map<String, dynamic>> results = await db.rawQuery('''
        SELECT data FROM records_to_sync
      ''');

      return results.map((row) {
        final jsonData = row['data'] as String;
        return json.decode(jsonData) as Map<String, dynamic>;
      }).toList();
    } catch (e) {
      print('Error getting records to sync: $e');
      return [];
    }
  }

  // Get count of records in temporary sync table
  Future<int> getRecordsToSyncCount() async {
    try {
      final db = await database;
      await _createRecordsToSyncTable(db);

      final result =
          await db.rawQuery('SELECT COUNT(*) as count FROM records_to_sync');
      return Sqflite.firstIntValue(result) ?? 0;
    } catch (e) {
      print('Error getting records to sync count: $e');
      return 0;
    }
  }

  // Clear all records from temporary sync table
  Future<void> clearRecordsToSync() async {
    try {
      final db = await database;
      await _createRecordsToSyncTable(db);
      await db.delete('records_to_sync');
      print('Temporary sync table cleared');
    } catch (e) {
      print('Error clearing records to sync: $e');
    }
  }

  // Update record in raw_records table with unique ID
  Future<bool> updateRecordWithUniqueId(
      String searchFromValue, String uniqueId) async {
    try {
      final db = await database;

      // Find the record with matching "Search from" value
      final results = await db.rawQuery('''
        SELECT id, data FROM raw_records 
        WHERE data LIKE ?
      ''', ['%"Search from"%$searchFromValue%']);

      if (results.isNotEmpty) {
        // Parse the existing data
        final existingData = json.decode(results.first['data'] as String)
            as Map<String, dynamic>;

        // Add the unique ID
        existingData['UniqueId'] = uniqueId;

        // Update the record
        await db.update(
          'raw_records',
          {'data': json.encode(existingData)},
          where: 'id = ?',
          whereArgs: [results.first['id']],
        );

        print(
            'Updated record with search from "$searchFromValue" with unique ID: $uniqueId');
        return true;
      } else {
        print('No record found with search from value: $searchFromValue');
        return false;
      }
    } catch (e) {
      print('Error updating record with unique ID: $e');
      return false;
    }
  }
}
