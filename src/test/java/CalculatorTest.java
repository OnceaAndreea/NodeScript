import calculator.demo.Calculator;
import org.junit.Assert;
import org.junit.Test;

public class CalculatorTest {

    Calculator calculator = new Calculator();

    @Test
    public void testAdd() {

        Assert.assertEquals(5, calculator.sum(2, 3));
    }

    @Test
    public void testMultimply() {
        Assert.assertEquals(6, calculator.multiply(2, 3));
    }

}
