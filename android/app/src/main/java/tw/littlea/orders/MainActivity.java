package tw.littlea.orders;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import android.widget.FrameLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
 private WebView web;
 private UpdateManager updates;
 private String pendingBackup;
 private static final int SAVE_BACKUP = 21;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
  FrameLayout container=new FrameLayout(this);
  container.setBackgroundColor(0xfff5f6f0);
  web = new WebView(this);
  web.setBackgroundColor(0xfff5f6f0);
  container.addView(web,new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));
  // Inset the parent so WebView's viewport actually shrinks to the usable area.
  // WebView padding alone does not reliably constrain a full-height HTML layout.
  ViewCompat.setOnApplyWindowInsetsListener(container,(v,insets)->{
   Insets safe=insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout()|WindowInsetsCompat.Type.ime());
   v.setPadding(safe.left,safe.top,safe.right,safe.bottom);
   return WindowInsetsCompat.CONSUMED;
  });
  setContentView(container);
  WindowCompat.getInsetsController(getWindow(),container).setAppearanceLightStatusBars(true);
  WindowCompat.getInsetsController(getWindow(),container).setAppearanceLightNavigationBars(true);
  ViewCompat.requestApplyInsets(container);
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(false);
  web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.getSettings().setTextZoom(100);
  WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClientCompat(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){return !isLocal(req.getUrl());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){
    if(isLocal(req.getUrl()))return loader.shouldInterceptRequest(req.getUrl());
    return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
   }
  });
  web.addJavascriptInterface(new BackupBridge(),"AndroidApp");
  web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
  updates=new UpdateManager(this);
 }
 private boolean isLocal(Uri uri){return "https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&uri.getPath()!=null&&uri.getPath().startsWith("/assets/");}
 public class BackupBridge {
  @JavascriptInterface public void saveBackup(String json){
   if(json==null||json.length()>20_000_000)return;
   runOnUiThread(()->{pendingBackup=json;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"小A點餐備份-"+java.time.LocalDate.now()+".json");startActivityForResult(intent,SAVE_BACKUP);});
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==SAVE_BACKUP){String json=pendingBackup;pendingBackup=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&json!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new java.io.IOException();out.write(json.getBytes(StandardCharsets.UTF_8));Toast.makeText(this,"備份已儲存",Toast.LENGTH_SHORT).show();}catch(Exception e){new AlertDialog.Builder(this).setMessage("備份儲存失敗，請重試。").setPositiveButton("確定",null).show();}}}
 }
 @Override protected void onResume(){super.onResume();if(updates!=null)updates.check();}
 @Override protected void onDestroy(){if(updates!=null)updates.close();if(web!=null){web.removeJavascriptInterface("AndroidApp");web.destroy();}super.onDestroy();}
 @Override public void onBackPressed(){new AlertDialog.Builder(this).setMessage("離開點餐程式？訂單已保存在本機。").setNegativeButton("繼續點餐",null).setPositiveButton("離開",(d,w)->finish()).show();}
}
