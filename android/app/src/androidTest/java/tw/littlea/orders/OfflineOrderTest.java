package tw.littlea.orders;
import android.webkit.WebView;
import android.view.ViewGroup;
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
  scenario.onActivity(a->{WebView web=(WebView)((ViewGroup)a.findViewById(android.R.id.content)).getChildAt(0);web.evaluateJavascript(js,value->{result.set(value);latch.countDown();});});assertTrue(latch.await(10,TimeUnit.SECONDS));return result.get();
 }
 private void loaded(ActivityScenario<MainActivity> scenario)throws Exception{for(int i=0;i<50;i++){if("true".equals(eval(scenario,"!!document.querySelector('[data-flavor]')")))return;Thread.sleep(200);}fail("Offline app failed to load");}
 @Test public void bundledMenuCreatesAndPersistsOrder()throws Exception{
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   loaded(scenario);
   assertEquals("true",eval(scenario,"(()=>{document.querySelector('[data-flavor=\"0\"]').click();document.querySelector('[data-action=\"add\"]').click();document.querySelector('[data-action=\"submit\"]').click();return JSON.parse(localStorage.getItem('little-a-orders-v1')).pending[0].items[0].price===50})()"));
   scenario.recreate();loaded(scenario);
   assertEquals("1",eval(scenario,"JSON.parse(localStorage.getItem('little-a-orders-v1')).pending.length"));
  }
 }
}
