// lib/models/member_model.dart
class Member {
  final String id; // Unique ID for the member (e.g., from your backend)
  final String name;
  final String taluka;
  // Add other fields as per your Excel data/backend structure
  // For example:
  // final String uniqueId; // If different from 'id'
  // final String district;
  // final String status; // 'processed', 'pending' etc.

  Member({
    required this.id,
    required this.name,
    required this.taluka,
    // Add required this.uniqueId, etc. for other fields
  });

  // Convert a Member object into a Map (for SQLite insertion).
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'taluka': taluka,
      // Add other fields here matching your database column names
      // 'uniqueId': uniqueId,
      // 'district': district,
      // 'status': status,
    };
  }

  // Convert a Map (from SQLite query result) into a Member object.
  factory Member.fromMap(Map<String, dynamic> map) {
    return Member(
      id: map['id'] as String,
      name: map['name'] as String,
      taluka: map['taluka'] as String,
      // Add other fields here matching your database column names
      // uniqueId: map['uniqueId'] as String,
      // district: map['district'] as String,
      // status: map['status'] as String,
    );
  }
}