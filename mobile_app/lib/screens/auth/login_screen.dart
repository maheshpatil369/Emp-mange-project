// // lib/screens/auth/login_screen.dart
// import 'package:flutter/material.dart';
// import 'package:provider/provider.dart';
// import '../../providers/auth_provider.dart'; // AuthProvider import karein

// class LoginScreen extends StatefulWidget {
//   const LoginScreen({super.key});

//   @override
//   State<LoginScreen> createState() => _LoginScreenState();
// }

// class _LoginScreenState extends State<LoginScreen> {
//   final TextEditingController _emailController = TextEditingController();
//   final TextEditingController _passwordController = TextEditingController();

//   @override
//   void dispose() {
//     _emailController.dispose();
//     _passwordController.dispose();
//     super.dispose();
//   }

//   void _login() async {
//     final authProvider = Provider.of<AuthProvider>(context, listen: false);
//     try {
//       // Method name `signInWithEmailAndPassword` ko call karein
//       await authProvider.signInWithEmailAndPassword(
//         _emailController.text,
//         _passwordController.text,
//       );

//       // Check if login was successful
//       if (authProvider.isAuthenticated) {
//         // Login successful hone par home screen par navigate karein
//         Navigator.of(context).pushReplacementNamed('/home');
//       } else {
//         // Show error message if authentication failed
//         ScaffoldMessenger.of(context).showSnackBar(
//           SnackBar(
//             content: Text(authProvider.errorMessage ?? 'Login failed'),
//             backgroundColor: Colors.red,
//           ),
//         );
//       }
//     } catch (e) {
//       // Unexpected error handling
//       ScaffoldMessenger.of(context).showSnackBar(
//         SnackBar(
//           content: Text('An unexpected error occurred: ${e.toString()}'),
//           backgroundColor: Colors.red,
//         ),
//       );
//     }
//   }

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(
//         title: const Text('Login'),
//       ),
//       body: Center(
//         child: SingleChildScrollView(
//           padding: const EdgeInsets.all(16.0),
//           child: Column(
//             mainAxisAlignment: MainAxisAlignment.center,
//             children: [
//               const Text(
//                 'Welcome Back!',
//                 style: TextStyle(
//                   fontSize: 32,
//                   fontWeight: FontWeight.bold,
//                   color: Colors.blueAccent,
//                 ),
//               ),
//               const SizedBox(height: 40),
//               TextField(
//                 controller: _emailController,
//                 decoration: const InputDecoration(
//                   labelText: 'Email',
//                   border: OutlineInputBorder(),
//                   prefixIcon: Icon(Icons.email),
//                 ),
//                 keyboardType: TextInputType.emailAddress,
//               ),
//               const SizedBox(height: 20),
//               TextField(
//                 controller: _passwordController,
//                 decoration: const InputDecoration(
//                   labelText: 'Password',
//                   border: OutlineInputBorder(),
//                   prefixIcon: Icon(Icons.lock),
//                 ),
//                 obscureText: true,
//               ),
//               const SizedBox(height: 30),
//               Consumer<AuthProvider>(
//                 builder: (context, authProvider, child) {
//                   return ElevatedButton(
//                     onPressed: authProvider.isLoading ? null : _login,
//                     style: ElevatedButton.styleFrom(
//                       foregroundColor: Colors.white,
//                       backgroundColor: Colors.blueAccent,
//                       padding: const EdgeInsets.symmetric(
//                           horizontal: 50, vertical: 15),
//                       textStyle: const TextStyle(fontSize: 18),
//                       shape: RoundedRectangleBorder(
//                         borderRadius: BorderRadius.circular(10),
//                       ),
//                     ),
//                     child: authProvider.isLoading
//                         ? const CircularProgressIndicator(color: Colors.white)
//                         : const Text('Login'),
//                   );
//                 },
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
// }
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true; // ✅ Password visibility toggle
  bool _showAdminNumber = false; // ✅ Contact admin toggle

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _login() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final dataProvider = Provider.of<DataProvider>(context, listen: false);

    try {
      await authProvider.signInWithEmailAndPassword(
        _emailController.text,
        _passwordController.text,
      );

      if (authProvider.isAuthenticated) {
        // Load user-specific data after successful login
        print('Loading user data after successful login...');
        await dataProvider.loadUserData();

        // Also try to sync with server (but preserve local counts)
        await dataProvider.fetchAndSyncBundles();

        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Login failed'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('An unexpected error occurred: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Center(
        child: SingleChildScrollView(
          child: Card(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            elevation: 4,
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ✅ Top Icon
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.green,
                    child:
                        const Icon(Icons.person, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 10),

                  // ✅ Title & Subtitle
                  const Text(
                    'User Login',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'Enter your credentials to access your dashboard.',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),

                  // ✅ Username Field
                  TextField(
                    controller: _emailController,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      hintText: 'Username ',
                      hintStyle: TextStyle(
                          color: Colors.grey[400]), // ✅ light hint color
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                            color: Colors.green,
                            width: 2), // ✅ Dark outline on focus
                      ),
                      prefixIcon: const Icon(Icons.person),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ✅ Password Field with Eye Icon
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide:
                            const BorderSide(color: Colors.green, width: 2),
                      ),
                      prefixIcon: const Icon(Icons.lock),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),

                  // ✅ Login Button
                  Consumer<AuthProvider>(
                    builder: (context, authProvider, child) {
                      return ElevatedButton(
                        onPressed: authProvider.isLoading ? null : _login,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          minimumSize: const Size(double.infinity, 50),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6)),
                        ),
                        child: authProvider.isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white)
                            : const Text('Sign In'),
                      );
                    },
                  ),
                  const SizedBox(height: 10),

                  // ✅ Contact Admin Button
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _showAdminNumber = !_showAdminNumber;
                      });
                    },
                    child: const Text(
                      'Contact Admin',
                      style: TextStyle(color: Colors.green),
                    ),
                  ),

                  // ✅ Show Admin Number when clicked
                  if (_showAdminNumber)
                    const Text(
                      '+91 91305 06776',
                      style: TextStyle(
                          color: Colors.black87, fontWeight: FontWeight.bold),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
