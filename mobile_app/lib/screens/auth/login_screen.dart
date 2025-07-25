import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // username controller ko email controller bana diya
  final _emailController = TextEditingController(text: 'testuser@example.com');
  final _passwordController = TextEditingController(text: '123456');
  final _formKey = GlobalKey<FormState>();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    _formKey.currentState!.save();

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    try {
      // login function ko ab email bhejenge
      await authProvider.login( // `bool success =` hata diya
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );

      // Agar login successful hota hai toh authProvider already isAuthenticated ko true kar dega
      // aur main.dart ka Consumer auto redirect kar dega MainNavigationScreen par.
      // Yahan explicit Navigator.of(context).pushReplacement ki zaroorat nahi hai.

    } catch (error) {
      // Error hone par (jaise 'user not exist')
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceAll('Exception: ', '')), // Exception text remove kar ke show karein
            backgroundColor: Colors.red,
          ),
        );
      }
    }
    // Loading state ko authProvider handle kar raha hai, to yahan setState ki zaroorat nahi
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
                // Username field ko Email field bana diya
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email', // Label badal diya
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email), // Icon badal diya
                  ),
                  keyboardType: TextInputType.emailAddress, // Keyboard type badal diya
                  validator: (value) {
                    if (value == null || value.isEmpty || !value.contains('@')) {
                      return 'Please enter a valid email'; // Validation badal diya
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