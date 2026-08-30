package in.envisiontechsol.crm;

import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // Android's WebView keeps new cookies (including the HttpOnly refresh
  // token the CRM API sets on login) in memory and only writes them to
  // disk on an explicit flush. Without this, Android killing the app in
  // the background — which it does aggressively and often — silently
  // drops that cookie, so the app looks logged in all session long but
  // asks for a fresh login every time it's reopened. Known Capacitor gap:
  // https://github.com/ionic-team/capacitor/issues/3012
  // Flushed from both callbacks since which one last runs before the OS
  // kills the process isn't guaranteed across devices.

  @Override
  public void onPause() {
    super.onPause();
    CookieManager.getInstance().flush();
  }

  @Override
  public void onStop() {
    super.onStop();
    CookieManager.getInstance().flush();
  }
}
