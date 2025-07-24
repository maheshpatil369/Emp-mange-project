// // lib/widgets/common/custom_drawer.dart
// import 'package:flutter/material.dart';

// class CustomDrawer extends StatelessWidget {
//   const CustomDrawer({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return Drawer(
//       child: ListView(
//         padding: EdgeInsets.zero,
//         children: [
//           const UserAccountsDrawerHeader(
//             accountName: Text("Mahesh Patil"),
//             accountEmail: Text("fakemahesh@example.com"),
//             currentAccountPicture: CircleAvatar(
//               backgroundColor: Colors.white,
//               child: Text(
//                 "M",
//                 style: TextStyle(fontSize: 40.0),
//               ),
//             ),
//           ),
//           ListTile(
//             leading: const Icon(Icons.dashboard),
//             title: const Text('Dashboard'),
//             onTap: () {
//               Navigator.pop(context);
//               // TODO: Add navigation logic
//             },
//           ),
//           ListTile(
//             leading: const Icon(Icons.data_usage),
//             title: const Text('Data Management'),
//             onTap: () {
//               Navigator.pop(context);
//               // TODO: Add navigation logic
//             },
//           ),
//           const Divider(),
//           ListTile(
//             leading: const Icon(Icons.logout),
//             title: const Text('Log Out'),
//             onTap: () {
//               Navigator.pop(context);
//               // TODO: Add logout logic
//             },
//           ),
//         ],
//       ),
//     );
//   }
// }

// lib/widgets/common/custom_drawer.dart
import 'package:flutter/material.dart';

class CustomDrawer extends StatelessWidget {
  const CustomDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const UserAccountsDrawerHeader(
            accountName: Text("Mahesh Patil"),
            accountEmail: Text("fakemahesh@example.com"),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                "M",
                style: TextStyle(fontSize: 40.0),
              ),
            ),
            // ✅ Set the green color extracted from the image
       decoration: BoxDecoration(
    color: Color(0xFF22B14C), // ← your custom green
  ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Dashboard'),
            onTap: () {
              Navigator.pop(context);
              // TODO: Add navigation logic
            },
          ),
          ListTile(
            leading: const Icon(Icons.data_usage),
            title: const Text('Data Management'),
            onTap: () {
              Navigator.pop(context);
              // TODO: Add navigation logic
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Log Out'),
            onTap: () {
              Navigator.pop(context);
              // TODO: Add logout logic
            },
          ),
        ],
      ),
    );
  }
}
