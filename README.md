PEDO PMO ASSET MANAGEMENT — OFFICE NETWORK EDITION
===================================================
This edition uses a central Python Flask server and SQLite database so multiple computers on the same private office network use the SAME records.

INSTALLATION (Windows server computer)
1. Extract this ZIP to a folder.
2. Install Python 3.10 or newer on the server computer.
3. Double-click run_windows.bat.
4. The script creates a virtual environment, installs Flask and asks you to set the shared office password.
5. Keep the server window open.
6. Find the server computer's LAN IPv4 address: open Command Prompt and run ipconfig.
7. On each office PC/mobile connected to the same LAN, open: http://SERVER-IP:8000
   Example only: http://192.168.1.20:8000
8. Sign in using the office password.

NETWORK FIREWALL
Allow Python through Windows Defender Firewall on Private networks only, or create a TCP inbound rule for port 8000 restricted to the office LAN subnet. Do not expose port 8000 directly to the public internet.

DATABASE
The shared database is created automatically at data/pedo_assets.db. Back up this file while the app is stopped, and also use Backup > Download JSON backup. Store backups securely.

OFFLINE LIMITATION
The application shell is cached as a PWA, but shared data operations require a connection to the central server. If a client computer loses the office network, it cannot read or save the latest shared records. This avoids conflicting unsynchronized copies. The server computer and LAN must be running for office access.

SECURITY
This starter uses one shared office password for all users. It does not yet provide individual staff accounts, role permissions, audit logs, HTTPS or encrypted database files. For official deployment, add individual accounts/roles, audit trail, scheduled backups, HTTPS and IT-approved server hardening. Use only on a trusted private office LAN.

NOTES
- First login session is maintained by a secure HTTP-only session cookie (Flask default).
- Change the shared password each time the server is deployed.
- For reliable long-running office use, run on an always-on office PC/server with UPS and scheduled backup.
- This is a starter deployment; validate PEDO asset codes, workflows and records before official use.
