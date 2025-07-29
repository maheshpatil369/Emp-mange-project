// lib/models/user_model.dart
// Yeh file aapke user data model ko define karti hai.

class User {
  final String email;
  final String name;
  // Aap yahan aur fields add kar sakte hain jaise aapke backend se aate hain:
  // final String? id; // Example: user ID
  // final String? role; // Example: user role (e.g., 'admin', 'user')

  User({
    required this.email,
    required this.name,
    // Agar upar koi naya field add kiya hai toh yahan bhi add karein
    // this.id,
    // this.role,
  });

  // Agar aapko backend se JSON data milta hai user ka, toh yeh factory method
  // JSON Map ko User object mein convert karne ke liye upyog kiya ja sakta hai.
  // factory User.fromJson(Map<String, dynamic> json) {
  //   return User(
  //     email: json['email'] as String,
  //     name: json['name'] as String,
  //     // id: json['id'] as String?,
  //     // role: json['role'] as String?,
  //   );
  // }

  // Agar aap User object ko Map mein convert karna chahte hain (jaise ki local storage ke liye)
  // Map<String, dynamic> toJson() {
  //   return {
  //     'email': email,
  //     'name': name,
  //     // 'id': id,
  //     // 'role': role,
  //   };
  // }
}
