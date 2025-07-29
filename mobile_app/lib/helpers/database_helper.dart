// // lib/helpers/database_helper.dart
// import 'package:sqflite/sqflite.dart';
// import 'package:path/path.dart';
// import 'package:path_provider/path_provider.dart';

// class DatabaseHelper {
//   static final DatabaseHelper instance = DatabaseHelper._init();
//   static Database? _database;
//   DatabaseHelper._init();

//   Future<Database> get database async {
//     if (_database != null) return _database!;
//     _database = await _initDB('records.db');
//     return _database!;
//   }

//   Future<Database> _initDB(String filePath) async {
//     final dbPath = await getDatabasesPath();
//     final path = join(dbPath, filePath);
//     return await openDatabase(path, version: 1, onCreate: _createDB);
//   }

//   Future _createDB(Database db, int version) async {
//     await db.execute('''
//       CREATE TABLE farmer_records (
//         local_id INTEGER PRIMARY KEY AUTOINCREMENT,
//         intimation_no TEXT UNIQUE,
//         farmer_name TEXT,
//         crop_name TEXT,
//         taluka TEXT,
//         insured_area REAL,
//         affected_area REAL,
//         loss_percentage INTEGER,
//         survey_date INTEGER,
//         correction_details TEXT,
//         pdf_required TEXT,
//         status TEXT NOT NULL
//       )
//     ''');
//   }

//   Future<void> insertRecord(Map<String, dynamic> row) async {
//     final db = await instance.database;
//     await db.insert('farmer_records', row,
//         conflictAlgorithm: ConflictAlgorithm.replace);
//   }

//   Future<void> updateRecord(Map<String, dynamic> row) async {
//     final db = await instance.database;
//     String intimationNo = row['intimation_no'];
//     await db.update('farmer_records', row,
//         where: 'intimation_no = ?', whereArgs: [intimationNo]);
//   }

//   Future<List<Map<String, dynamic>>> getLocalRecords() async {
//     final db = await instance.database;
//     return await db.query('farmer_records', orderBy: "local_id");
//   }

//   Future<List<Map<String, dynamic>>> getUnsyncedRecords() async {
//     final db = await instance.database;
//     return await db.query('farmer_records', where: 'status = ?', whereArgs: ['edited']);
//   }

//   Future<int> clearRecords() async {
//     final db = await instance.database;
//     return await db.delete('farmer_records');
//   }
// }


// lib/helpers/database_helper.dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/member_model.dart'; // MemberModel import karein

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  static Database? _database;

  // Database instance ko provide karega
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  // Database ko initialize karega aur table banayega
  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'emp_management.db');
    return await openDatabase(
      path,
      version: 1, // Database version, schema changes par increment karein
      onCreate: _onCreate, // Jab database pehli baar banega
    );
  }

  // Table creation logic
  Future<void> _onCreate(Database db, int version) async {
    // 'members' table banayein. Columns aapke MemberModel se match karne chahiye.
    // Ensure 'id' is TEXT PRIMARY KEY
    await db.execute('''
      CREATE TABLE members(
        id TEXT PRIMARY KEY,
        name TEXT,
        taluka TEXT
        // Yahan aur bhi columns add karein jo aapke MemberModel mein hain.
        // For example:
        // uniqueId TEXT,
        // district TEXT,
        // status TEXT
      )
    ''');
  }

  // Record ko local database mein insert karein ya update karein agar exist karta hai
  Future<int> insertMember(Member member) async {
    final db = await database;
    return await db.insert(
      'members',
      member.toMap(), // MemberModel se Map mein convert karein
      conflictAlgorithm: ConflictAlgorithm.replace, // Agar ID pehle se hai toh replace karein
    );
  }

  // Saare records local database se fetch karne ke liye (for DataScreen)
  Future<List<Member>> getRecords() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('members');

    // Query results (maps) ko List<Member> objects mein convert karein
    return List.generate(maps.length, (i) {
      return Member.fromMap(maps[i]); // Map se Member object banayein
    });
  }

  // Local database mein record search karne ke liye (Offline Search ke liye)
  Future<List<Member>> searchRecords(String query) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'members',
      where: 'id LIKE ? OR name LIKE ?', // Example: ID ya Name se search karein
      whereArgs: ['%$query%', '%$query%'], // Wildcard matching ke liye % use karein
    );
    return List.generate(maps.length, (i) {
      return Member.fromMap(maps[i]);
    });
  }

  // Saare records clear karne ke liye (e.g., logout ya reset par)
  Future<void> clearAllRecords() async {
    final db = await database;
    await db.delete('members');
  }
}