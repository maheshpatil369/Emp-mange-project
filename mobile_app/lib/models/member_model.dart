class Member {
  final String name;
  final String taluka; // ✅ 'taluka' field yahan define kiya hai

  Member({
    required this.name,
    required this.taluka, // ✅ Constructor mein bhi add kiya hai
  });
}