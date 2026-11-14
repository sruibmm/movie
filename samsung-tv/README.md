# Cinema TV — Samsung Edition
Tizen Web project for Samsung CU7000 (2023, original Tizen 7.0). Uses the existing public Cinema catalogue and video endpoints, no login or admin secret.

## Build/install
1. Install Tizen Studio with Samsung TV Extensions and Samsung Certificate Extension.
2. Connect the TV and computer on the same LAN. Enable Developer Mode in Apps using 12345, enter computer IP and restart TV.
3. In Device Manager add the TV IP and connect. In Certificate Manager create Samsung TV certificate profile including the connected device DUID.
4. Import this folder as a Tizen Web project (or create a TV Web Basic project and replace its config.xml, index.html, app.js and icon.png). Use the TV profile and Tizen 6.0 or newer.
5. Build Signed Package (.wgt), then Run As Tizen Web Application on connected TV.

This source is not a signed installable WGT. Never share the certificate password or private key. The TV app uses the public HTTPS read-only Cinema API, and online availability depends on that API and media source. No credentials or video files are bundled.
