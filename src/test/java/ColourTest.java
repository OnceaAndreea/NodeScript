import calculator.demo.Calculator;
import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class ColourTest {

    Calculator calculator = new Calculator();

    @Test
    public void testBloodColour() {
        assertEquals("red", calculator.getBloodColour());
    }

    @Test
    public void testSunColour() {
        assertEquals("yellow", calculator.getSunColour());
    }

}
