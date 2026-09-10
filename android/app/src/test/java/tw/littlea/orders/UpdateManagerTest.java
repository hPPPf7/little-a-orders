package tw.littlea.orders;
import org.junit.Test;
import static org.junit.Assert.*;
public class UpdateManagerTest {
 @Test public void releaseVersionOrdering(){assertEquals(10000,UpdateManager.versionCode("v1.0.0"));assertTrue(UpdateManager.versionCode("v1.0.1")>UpdateManager.versionCode("v1.0.0"));assertTrue(UpdateManager.versionCode("v1.10.0")>UpdateManager.versionCode("v1.9.9"));}
 @Test public void rejectsInvalidAndPreviewTags(){for(String tag:new String[]{"main","v1.0.0-beta","v1.100.0","v99999.1.1","v1.0.1/../../evil"})assertEquals(-1,UpdateManager.versionCode(tag));}
}
