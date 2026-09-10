package tw.littlea.orders;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
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
 private long lastCheck=0;
 private File pending;
 UpdateManager(Activity activity){this.activity=activity;}
 void check(){
  if(pending!=null&&activity.getPackageManager().canRequestPackageInstalls()){File ready=pending;pending=null;offer(ready);return;}
  if(busy||System.currentTimeMillis()-lastCheck<6*60*60*1000)return;
  busy=true;lastCheck=System.currentTimeMillis();
  executor.execute(()->{try{
   JSONObject release=new JSONObject(new String(read("https://api.github.com/repos/"+REPO+"/releases/latest",1_000_000),StandardCharsets.UTF_8));
   if(release.optBoolean("draft")||release.optBoolean("prerelease"))return;
   String tag=release.getString("tag_name");if(versionCode(tag)<=BuildConfig.VERSION_CODE)return;
   JSONArray assets=release.getJSONArray("assets");String url=null;
   for(int i=0;i<assets.length();i++){JSONObject a=assets.getJSONObject(i);if("little-a-orders.apk".equals(a.getString("name")))url=a.getString("browser_download_url");}
   String expected="https://github.com/"+REPO+"/releases/download/"+tag+"/little-a-orders.apk";
   if(!expected.equals(url))throw new IOException("Unexpected release asset");
   File dir=new File(activity.getCacheDir(),"updates");if(!dir.exists()&&!dir.mkdirs())throw new IOException("Cache unavailable");
   File apk=new File(dir,"little-a-orders.apk");try(FileOutputStream out=new FileOutputStream(apk)){out.write(read(url,30_000_000));}
   verify(apk);activity.runOnUiThread(()->offer(apk));
  }catch(Exception ignored){/* Offline, rate limits or invalid signatures must never interrupt ordering. */}
  finally{activity.runOnUiThread(()->busy=false);}});
 }
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
