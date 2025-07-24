
// // // screens/auth/login_screen.dart
// // import 'package:flutter/material.dart';
// // import '../main_navigation_screen.dart';

// // class LoginScreen extends StatefulWidget {
// //   const LoginScreen({super.key});

// //   @override
// //   State<LoginScreen> createState() => _LoginScreenState();
// // }

// // class _LoginScreenState extends State<LoginScreen> {
// //   final _emailController = TextEditingController();
// //   final _passwordController = TextEditingController();
// //   bool _isLoading = false;

// //   void _login() async {
// //     setState(() {
// //       _isLoading = true;
// //     });

// //     // Dummy login, yahan aap ApiService call karenge
// //     await Future.delayed(const Duration(seconds: 2));

// //     setState(() {
// //       _isLoading = false;
// //     });
    
// //     // Login successful hone par
// //     Navigator.of(context).pushReplacement(
// //       MaterialPageRoute(builder: (context) => const MainNavigationScreen()),
// //     );
// //   }

// //   @override
// //   Widget build(BuildContext context) {
// //     return Scaffold(
// //       body: Center(
// //         child: SingleChildScrollView(
// //           padding: const EdgeInsets.all(24.0),
// //           child: Column(
// //             mainAxisAlignment: MainAxisAlignment.center,
// //             children: [
// //               Text(
// //                 'Welcome Back!',
// //                 style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
// //               ),
// //               const SizedBox(height: 8),
// //               Text(
// //                 'Login to your account',
// //                 style: Theme.of(context).textTheme.bodyMedium,
// //               ),
// //               const SizedBox(height: 40),
// //               TextField(
// //                 controller: _emailController,
// //                 decoration: const InputDecoration(
// //                   labelText: 'Email',
// //                   border: OutlineInputBorder(),
// //                   prefixIcon: Icon(Icons.email),
// //                 ),
// //                 keyboardType: TextInputType.emailAddress,
// //               ),
// //               const SizedBox(height: 16),
// //               TextField(
// //                 controller: _passwordController,
// //                 obscureText: true,
// //                 decoration: const InputDecoration(
// //                   labelText: 'Password',
// //                   border: OutlineInputBorder(),
// //                   prefixIcon: Icon(Icons.lock),
// //                 ),
// //               ),
// //               const SizedBox(height: 30),
// //               _isLoading
// //                   ? const CircularProgressIndicator()
// //                   : SizedBox(
// //                       width: double.infinity,
// //                       child: ElevatedButton(
// //                         onPressed: _login,
// //                         style: ElevatedButton.styleFrom(
// //                           padding: const EdgeInsets.symmetric(vertical: 16),
// //                           shape: RoundedRectangleBorder(
// //                             borderRadius: BorderRadius.circular(8),
// //                           ),
// //                         ),
// //                         child: const Text('Login'),
// //                       ),
// //                     ),
// //             ],
// //           ),
// //         ),
// //       ),
// //     );
// //   }
// // }


// // screens/auth/login_screen.dart

// import 'package:flutter/material.dart';
// import '../main_navigation_screen.dart';

// class LoginScreen extends StatefulWidget {
//   const LoginScreen({super.key});

//   @override
//   State<LoginScreen> createState() => _LoginScreenState();
// }

// class _LoginScreenState extends State<LoginScreen> {
//   final _usernameController = TextEditingController();
//   final _passwordController = TextEditingController();
//   bool _isLoading = false;
//   bool _obscurePassword = true; // 👁️ default hide

//   void _login() async {
//     setState(() {
//       _isLoading = true;
//     });

//     // Dummy login delay
//     await Future.delayed(const Duration(seconds: 2));

//     setState(() {
//       _isLoading = false;
//     });

//     Navigator.of(context).pushReplacement(
//       MaterialPageRoute(builder: (context) => const MainNavigationScreen()),
//     );
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       backgroundColor: const Color(0xFFF2F2F2), // Light grey background
//       body: Center(
//         child: SingleChildScrollView(
//           padding: const EdgeInsets.all(24.0),
//           child: Container(
//             padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
//             decoration: BoxDecoration(
//               color: Colors.white,
//               borderRadius: BorderRadius.circular(12),
//               boxShadow: const [
//                 BoxShadow(
//                   color: Colors.black12,
//                   blurRadius: 10,
//                   spreadRadius: 2,
//                   offset: Offset(0, 4),
//                 )
//               ],
//             ),
//             width: 400, // Fixed width for card-like feel
//             child: Column(
//               mainAxisSize: MainAxisSize.min,
//               children: [
//                 // Green Circle Avatar with Icon
//                 const CircleAvatar(
//                   radius: 32,
//                   backgroundColor: Color(0xFF22B14C),
//                   child: Icon(Icons.person, color: Colors.white, size: 32),
//                 ),
//                 const SizedBox(height: 24),

//                 const Text(
//                   'User Login',
//                   style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
//                 ),
//                 const SizedBox(height: 8),
//                 const Text(
//                   'Enter your credentials to access your dashboard.',
//                   style: TextStyle(color: Colors.black54),
//                   textAlign: TextAlign.center,
//                 ),
//                 const SizedBox(height: 32),

//                 // Username Field
//                 Align(
//                   alignment: Alignment.centerLeft,
//                   child: const Text('Username'),
//                 ),
//                 const SizedBox(height: 6),
//                 TextField(
//                   controller: _usernameController,
//                   decoration: const InputDecoration(
//                     hintText: 'Enter your username',
//                     border: OutlineInputBorder(),
//                   ),
//                 ),

//                 const SizedBox(height: 20),

//                 // Password Field
//                 Align(
//                   alignment: Alignment.centerLeft,
//                   child: const Text('Password'),
//                 ),
//                 const SizedBox(height: 6),
//                 TextField(
//                   controller: _passwordController,
//                   obscureText: _obscurePassword,
//                   decoration: InputDecoration(
//                     border: const OutlineInputBorder(),
//                     suffixIcon: IconButton(
//                       icon: Icon(
//                         _obscurePassword
//                             ? Icons.visibility_off
//                             : Icons.visibility,
//                         color: Colors.grey,
//                       ),
//                       onPressed: () {
//                         setState(() {
//                           _obscurePassword = !_obscurePassword;
//                         });
//                       },
//                     ),
//                   ),
//                 ),

//                 const SizedBox(height: 30),

//                 _isLoading
//                     ? const CircularProgressIndicator()
//                     : SizedBox(
//                         width: double.infinity,
//                         child: ElevatedButton(
//                           onPressed: _login,
//                           style: ElevatedButton.styleFrom(
//                             backgroundColor: const Color(0xFF22B14C),
//                             padding: const EdgeInsets.symmetric(vertical: 16),
//                             shape: RoundedRectangleBorder(
//                               borderRadius: BorderRadius.circular(6),
//                             ),
//                           ),
//                           child: const Text(
//                             'Sign In',
//                             style: TextStyle(fontWeight: FontWeight.bold),
//                           ),
//                         ),
//                       ),
//                 const SizedBox(height: 16),

//                 GestureDetector(
//                   onTap: () {
//                     // TODO: Implement contact admin action
//                   },
//                   child: const Text(
//                     'Contact Admin',
//                     style: TextStyle(
//                       color: Color(0xFF22B14C),
//                       decoration: TextDecoration.underline,
//                     ),
//                   ),
//                 )
//               ],
//             ),
//           ),
//         ),
//       ),
//     );
//   }
// }








// import 'package:flutter/material.dart';
// import 'package:provider/provider.dart';
// import '../../api/api_service.dart';
// import '../../providers/auth_provider.dart';
// import '../main_navigation_screen.dart'; // Is line ko import karein

// // Aapke UI widgets jahan hain, wahan koi change nahi hoga.
// // Main sirf button ke onPressed function mein logic add kar raha hoon.

// class LoginScreen extends StatefulWidget {
//   const LoginScreen({super.key});

//   @override
//   State<LoginScreen> createState() => _LoginScreenState();
// }

// class _LoginScreenState extends State<LoginScreen> {
//   final _emailController = TextEditingController();
//   final _passwordController = TextEditingController();
//   final _apiService = ApiService();
//   bool _isLoading = false;

//   Future<void> _login() async {
//     setState(() {
//       _isLoading = true;
//     });

//     try {
//       final token = await _apiService.login(
//         _emailController.text,
//         _passwordController.text,
//       );
      
//       // Provider se token save karein
//       await Provider.of<AuthProvider>(context, listen: false).login(token);

//       // Login successful hone par
//       if (mounted) {
//         Navigator.of(context).pushReplacement(
//           MaterialPageRoute(builder: (ctx) => const MainNavigationScreen()),
//         );
//       }

//     } catch (error) {
//       // Error hone par
//       if (mounted) {
//         ScaffoldMessenger.of(context).showSnackBar(
//           SnackBar(
//             content: Text(error.toString().replaceAll('Exception: ', '')),
//             backgroundColor: Colors.red,
//           ),
//         );
//       }
//     } finally {
//       if (mounted) {
//         setState(() {
//           _isLoading = false;
//         });
//       }
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     // AAPKA UI CODE YAHAAN HOGA (jaisa hai waisa hi rahega)
//     return Scaffold(
//       body: Padding(
//         padding: const EdgeInsets.all(16.0),
//         child: Column(
//           mainAxisAlignment: MainAxisAlignment.center,
//           children: [
//             TextField(
//               controller: _emailController,
//               decoration: const InputDecoration(labelText: 'Email'),
//               keyboardType: TextInputType.emailAddress,
//             ),
//             const SizedBox(height: 12),
//             TextField(
//               controller: _passwordController,
//               decoration: const InputDecoration(labelText: 'Password'),
//               obscureText: true,
//             ),
//             const SizedBox(height: 20),
//             if (_isLoading)
//               const CircularProgressIndicator()
//             else
//               ElevatedButton(
//                 onPressed: _login, // Yahan _login function call hoga
//                 child: const Text('Login'),
//               ),
//           ],
//         ),
//       ),
//     );
//   }
// }
// lib/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'testuser');
  final _passwordController = TextEditingController(text: '123456');
  final _formKey = GlobalKey<FormState>();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    _formKey.currentState!.save();

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    bool success = await authProvider.login(
      _usernameController.text.trim(),
      _passwordController.text.trim(),
    );

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Login Failed. Please check your username and password.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Text(
                  'User Login',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 40),
                TextFormField(
                  controller: _usernameController,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your username';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder(), prefixIcon: Icon(Icons.lock)),
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your password';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 30),
                Consumer<AuthProvider>(
                  builder: (ctx, auth, _) => auth.isLoading
                      ? const CircularProgressIndicator()
                      : SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _submit,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('Login', style: TextStyle(fontSize: 18)),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}