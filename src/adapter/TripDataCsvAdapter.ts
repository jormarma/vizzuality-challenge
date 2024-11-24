import { CsvAdapter, TripDataRow } from "../types/types";

export class TripDataCsvAdapter implements CsvAdapter<TripDataRow> {
    private date(stringDate: string) {
        return stringDate !== "" ? new Date(`${stringDate}.000Z`) : null;
    }

    private num(stringNum: string) {
        return Number(stringNum) || null;
    }

    private flag(stringFlag: string) {
        return stringFlag === "Y";
    }

    lineToObject(line: string): TripDataRow {
        const record = line.trim().split(",");
        const [
            hvfhs_license_num,
            dispatching_base_num,
            originating_base_num,
            request_datetime,
            on_scene_datetime,
            pickup_datetime,
            dropoff_datetime,
            PULocationID,
            DOLocationID,
            trip_miles,
            trip_time,
            base_passenger_fare,
            tolls,
            bcf,
            sales_tax,
            congestion_surcharge,
            airport_fee,
            tips,
            driver_pay,
            shared_request_flag,
            shared_match_flag,
            access_a_ride_flag,
            wav_request_flag,
            wav_match_flag,
        ] = record;
        return {
            hvfhs_license_num,
            dispatching_base_num,
            originating_base_num,
            request_datetime: this.date(request_datetime),
            on_scene_datetime: this.date(on_scene_datetime),
            pickup_datetime: this.date(pickup_datetime),
            dropoff_datetime: this.date(dropoff_datetime),
            PULocationID: this.num(PULocationID),
            DOLocationID: this.num(DOLocationID),
            trip_miles: this.num(trip_miles),
            trip_time: this.num(trip_time),
            base_passenger_fare: this.num(base_passenger_fare),
            tolls: this.num(tolls),
            bcf: this.num(bcf),
            sales_tax: this.num(sales_tax),
            congestion_surcharge: this.num(congestion_surcharge),
            airport_fee: this.num(airport_fee),
            tips: this.num(tips),
            driver_pay: this.num(driver_pay),
            shared_request_flag: this.flag(shared_request_flag),
            shared_match_flag: this.flag(shared_match_flag),
            access_a_ride_flag: access_a_ride_flag === "Y",
            wav_request_flag: wav_request_flag === "Y",
            wav_match_flag: wav_match_flag === "Y",
        };
    }
}
