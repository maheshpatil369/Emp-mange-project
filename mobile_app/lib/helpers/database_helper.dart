// lib/helpers/database_helper.dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;
  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('records.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);
    return await openDatabase(path, version: 1, onCreate: _createDB);
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE farmer_records (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        intimation_no TEXT UNIQUE,
        farmer_name TEXT,
        crop_name TEXT,
        taluka TEXT,
        insured_area REAL,
        affected_area REAL,
        loss_percentage INTEGER,
        survey_date INTEGER,
        correction_details TEXT,
        pdf_required TEXT,
        status TEXT NOT NULL
      )
    ''');
  }

  Future<void> insertRecord(Map<String, dynamic> row) async {
    final db = await instance.database;
    await db.insert('farmer_records', row,
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> updateRecord(Map<String, dynamic> row) async {
    final db = await instance.database;
    String intimationNo = row['intimation_no'];
    await db.update('farmer_records', row,
        where: 'intimation_no = ?', whereArgs: [intimationNo]);
  }

  Future<List<Map<String, dynamic>>> getLocalRecords() async {
    final db = await instance.database;
    return await db.query('farmer_records', orderBy: "local_id");
  }

  Future<List<Map<String, dynamic>>> getUnsyncedRecords() async {
    final db = await instance.database;
    return await db.query('farmer_records', where: 'status = ?', whereArgs: ['edited']);
  }

  Future<int> clearRecords() async {
    final db = await instance.database;
    return await db.delete('farmer_records');
  }
}