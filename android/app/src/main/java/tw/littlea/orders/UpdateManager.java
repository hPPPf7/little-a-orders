package tw.littlea.orders;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class UpdateManager {
 static final String REPO="hPPPf7/little-a-orders";
 private final Activity activity;
 private final ExecutorService executor=Executors.newSingleThreadExecutor();
 private boolean busy=false;
 private long nextCheckAt=0;
 private File pending;
 UpdateManager(Activity activity){this.activity=activity;}
 void check(){check(false);}
 void check(boolean manual){
  if(pending!=null&&activity.getPackageManager().canRequestPackageInstalls()){File ready=pending;pending=null;offer(ready);return;}
  if(busy){if(manual)notifyUser("正在檢查或下載更新，請稍候。");return;}
  if(!manual&&System.currentTimeMillis()<nextCheckAt)return;
  busy=true;
  if(manual)notifyUser("目前 v"+BuildConfig.VERSION_NAME+"，正在檢查更新…");
  executor.execute(()->{try{
   JSONObject release=new JSONObject(new String(read("https://api.github.com/repos/"+REPO+"/releases/latest",1_000_000),StandardCharsets.UTF_8));
   if(release.optBoolean("draft")||release.optBoolean("prerelease"))throw new IOException("尚無可安裝的正式版本");
   String tag=release.getString("tag_name");if(versionCode(tag)<0)throw new IOException("伺服器版本格式不正確");
   if(versionCode(tag)<=BuildConfig.VERSION_CODE){activity.runOnUiThread(()->{nextCheckAt=System.currentTimeMillis()+retryDelay(true);if(manual)message("檢查更新","目前 v"+BuildConfig.VERSION_NAME+"，已是最新版本。",false);});return;}
   JSONArray assets=release.getJSONArray("assets");String url=null;
   for(int i=0;i<assets.length();i++){JSONObject a=assets.getJSONObject(i);if("little-a-orders.apk".equals(a.getString("name")))url=a.getString("browser_download_url");}
   String expected="https://github.com/"+REPO+"/releases/download/"+tag+"/little-a-orders.apk";
   if(!expected.equals(url))throw new IOException("新版安裝檔尚未就緒");
   activity.runOnUiThread(()->notifyUser("發現 "+tag+"，正在下載更新…"));
   File dir=new File(activity.getCacheDir(),"updates");if(!dir.exists()&&!dir.mkdirs())throw new IOException("Cache unavailable");
   File apk=new File(dir,"little-a-orders.apk");try(FileOutputStream out=new FileOutputStream(apk)){out.write(read(url,30_000_000));}
   verify(apk);activity.runOnUiThread(()->{nextCheckAt=System.currentTimeMillis()+retryDelay(true);offer(apk);});
  }catch(Exception error){
   Log.w("LittleAUpdate","Update check failed",error);
   activity.runOnUiThread(()->{nextCheckAt=System.currentTimeMillis()+retryDelay(false);if(manual)message("更新未完成","目前 v"+BuildConfig.VERSION_NAME+"\n"+failureMessage(error)+"\n可以重試，或直接到下載頁覆蓋安裝；不要解除安裝。",true);else notifyUser("更新檢查未完成，可點右上角版本按鈕重試。");});
  }
  finally{activity.runOnUiThread(()->busy=false);}});
 }
 static long retryDelay(boolean success){return success?6*60*60*1000L:60*1000L;}
 private String failureMessage(Exception error){
  if(error instanceof java.net.UnknownHostException)return "無法連上 GitHub，請確認網路或 DNS。";
  if(error instanceof java.net.SocketTimeoutException)return "連線或下載逾時，請稍後重試。";
  if(error instanceof javax.net.ssl.SSLException)return "安全連線失敗，請確認裝置日期時間與網路。";
  if(error instanceof SecurityException)return "更新簽章驗證未通過，已停止安裝。";
  if(error.getMessage()!=null&&(error.getMessage().contains("HTTP 403")||error.getMessage().contains("HTTP 429")))return "GitHub 暫時限制此網路的查詢次數。";
  return "無法取得更新（"+error.getClass().getSimpleName()+"）。請確認可連線至 GitHub。";
 }
 private void notifyUser(String text){if(!activity.isFinishing()&&!activity.isDestroyed())Toast.makeText(activity,text,Toast.LENGTH_LONG).show();}
 private void message(String title,String text,boolean downloadLink){if(activity.isFinishing()||activity.isDestroyed())return;AlertDialog.Builder dialog=new AlertDialog.Builder(activity).setTitle(title).setMessage(text).setPositiveButton("確定",null);if(downloadLink)dialog.setNeutralButton("開啟下載頁",(d,w)->activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://github.com/"+REPO+"/releases/latest"))));dialog.show();}
 static int versionCode(String tag){if(!tag.matches("v[0-9]{1,3}\\.[0-9]{1,2}\\.[0-9]{1,2}"))return -1;String[] p=tag.substring(1).split("\\.");return Integer.parseInt(p[0])*10000+Integer.parseInt(p[1])*100+Integer.parseInt(p[2]);}
 private void verify(File apk)throws Exception{
  PackageManager pm=activity.getPackageManager();PackageInfo downloaded=pm.getPackageArchiveInfo(apk.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES);PackageInfo installed=pm.getPackageInfo(activity.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES);
  if(downloaded==null||!activity.getPackageName().equals(downloaded.packageName)||downloaded.getLongVersionCode()<=installed.getLongVersionCode()||downloaded.signingInfo==null||installed.signingInfo==null||!Arrays.equals(downloaded.signingInfo.getApkContentsSigners(),installed.signingInfo.getApkContentsSigners()))throw new SecurityException("Update signature mismatch");
 }
 private void offer(File apk){if(activity.isFinishing()||activity.isDestroyed())return;new AlertDialog.Builder(activity).setTitle("有新版本可更新").setMessage("新版已下載。更新會保留訂單，請在方便時安裝。").setNegativeButton("稍後",(d,w)->{}).setPositiveButton("安裝更新",(d,w)->install(apk)).show();}
 private void install(File apk){try{verify(apk);if(!activity.getPackageManager().canRequestPackageInstalls()){pending=apk;activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())));return;}Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".files",apk);activity.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));}catch(Exception e){new AlertDialog.Builder(activity).setMessage("無法安裝更新，請稍後重試或至 GitHub Releases 下載。").setPositiveButton("確定",null).show();}}
 private static byte[] read(String address,int limit)throws Exception{
  URL url=new URL(address);
  for(int hop=0;hop<5;hop++){
   String host=url.getHost();if(!"https".equals(url.getProtocol())||!(host.equals("api.github.com")||host.equals("github.com")||host.equals("release-assets.githubusercontent.com")||host.equals("objects.githubusercontent.com")))throw new IOException("Disallowed update host");
   javax.net.ssl.HttpsURLConnection connection=(javax.net.ssl.HttpsURLConnection)url.openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(30000);connection.setRequestProperty("User-Agent","LittleAOrders/"+BuildConfig.VERSION_NAME);connection.setInstanceFollowRedirects(false);
   try{int code=connection.getResponseCode();if(code>=300&&code<400){url=new URL(url,connection.getHeaderField("Location"));continue;}if(code!=200)throw new IOException("HTTP "+code);try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>limit)throw new IOException("Update too large");out.write(buffer,0,n);}return out.toByteArray();}}finally{connection.disconnect();}
  }throw new IOException("Too many redirects");
 }
 void close(){executor.shutdownNow();}
}
