package tw.littlea.orders;
import android.webkit.WebView;
import android.view.ViewGroup;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class OfflineOrderTest {
 private String eval(ActivityScenario<MainActivity> scenario,String js)throws Exception{
  AtomicReference<String> result=new AtomicReference<>();CountDownLatch latch=new CountDownLatch(1);
  scenario.onActivity(a->{ViewGroup container=(ViewGroup)((ViewGroup)a.findViewById(android.R.id.content)).getChildAt(0);WebView web=(WebView)container.getChildAt(0);web.evaluateJavascript(js,value->{result.set(value);latch.countDown();});});assertTrue(latch.await(10,TimeUnit.SECONDS));return result.get();
 }
 private void loaded(ActivityScenario<MainActivity> scenario)throws Exception{for(int i=0;i<50;i++){if("true".equals(eval(scenario,"!!document.querySelector('[data-flavor]')")))return;Thread.sleep(200);}fail("Offline app failed to load");}
 @Test public void bundledMenuCreatesAndPersistsOrder()throws Exception{
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   loaded(scenario);
   assertEquals("\"檢查更新\"",eval(scenario,"document.querySelector('.update-button').textContent"));
   assertEquals("\"目前版本 v"+BuildConfig.VERSION_NAME+"\"",eval(scenario,"document.querySelector('.update-button').title"));
   assertEquals("true",eval(scenario,"(()=>{document.querySelector('[data-flavor=\"0\"]').click();document.querySelector('[data-action=\"add\"]').click();document.querySelector('[data-action=\"submit\"]').click();return JSON.parse(localStorage.getItem('little-a-orders-v1')).pending[0].items[0].price===50})()"));
   scenario.recreate();loaded(scenario);
   assertEquals("1",eval(scenario,"JSON.parse(localStorage.getItem('little-a-orders-v1')).pending.length"));
  }
 }
 @Test public void viewportExcludesSystemBarsCutoutAndKeyboard()throws Exception{
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   loaded(scenario);
   scenario.onActivity(a->{
    ViewGroup container=(ViewGroup)((ViewGroup)a.findViewById(android.R.id.content)).getChildAt(0);
    int width=container.getWidth(),height=container.getHeight();
    WindowInsetsCompat insets=new WindowInsetsCompat.Builder()
     .setInsets(WindowInsetsCompat.Type.systemBars(),Insets.of(0,24,0,48))
     .setInsets(WindowInsetsCompat.Type.displayCutout(),Insets.of(36,40,0,0))
     .setInsets(WindowInsetsCompat.Type.ime(),Insets.of(0,0,0,120)).build();
    ViewCompat.dispatchApplyWindowInsets(container,insets);
    container.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(height,View.MeasureSpec.EXACTLY));
    container.layout(0,0,width,height);
    View web=container.getChildAt(0);
    assertEquals(36,web.getLeft());assertEquals(40,web.getTop());
    assertEquals(width-36,web.getWidth());assertEquals(height-160,web.getHeight());
    assertEquals(0,web.getPaddingTop());assertEquals(0,web.getPaddingBottom());
   });
  }
 }
}
