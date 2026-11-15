package app.capcar.proto;

import android.car.Car;
import android.car.VehicleGear;
import android.car.VehiclePropertyIds;
import android.car.hardware.property.CarPropertyManager;
import android.content.Context;

public class CarReader {

    private final CarPropertyManager properties;

    public CarReader(Context context) {
        Car car = Car.createCar(context);
        properties = (CarPropertyManager) car.getCarManager(Car.PROPERTY_SERVICE);
    }

    public String speedText() {
        try {
            float metersPerSecond = properties.getFloatProperty(VehiclePropertyIds.PERF_VEHICLE_SPEED, 0);
            return String.valueOf(Math.round(Math.abs(metersPerSecond) * 3.6f));
        } catch (Throwable error) {
            return "null";
        }
    }

    public String gearText() {
        try {
            int gear = properties.getIntProperty(VehiclePropertyIds.GEAR_SELECTION, 0);
            if (gear == VehicleGear.GEAR_PARK) {
                return "'P'";
            }
            if (gear == VehicleGear.GEAR_DRIVE) {
                return "'D'";
            }
            return "null";
        } catch (Throwable error) {
            return "null";
        }
    }
}
