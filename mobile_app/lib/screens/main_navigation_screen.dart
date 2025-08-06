import 'package:flutter/material.dart';
import 'home/home_screen.dart';
import 'data_management/data_screen.dart';
import 'profile/profile_screen.dart';
// import '../widgets/comman/custom_drawer.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;

  static const List<Widget> _widgetOptions = <Widget>[
    HomeScreen(),
    DataScreen(),
    ProfileScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          ['Dashboard', 'Data Management', 'Profile'][_selectedIndex],
        ),
        backgroundColor: const Color(0xFF22B14C), // ✅ Green header
        elevation: 1,
        foregroundColor: Colors.white, // ✅ White text/icon
      ),
      // drawer: const CustomDrawer(),

      backgroundColor: const Color(0xFFF2F2F2), // ✅ Light grey background

      body: Center(
        child: _widgetOptions.elementAt(_selectedIndex),
      ),

      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.data_usage),
            label: 'Data',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Colors.white, // ✅ Active icon color
        unselectedItemColor: Colors.white70, // ✅ Inactive icon color
        backgroundColor: const Color(0xFF22B14C), // ✅ Green footer
        onTap: _onItemTapped,
      ),
    );
  }
}
