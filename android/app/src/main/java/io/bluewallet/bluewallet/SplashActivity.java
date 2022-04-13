package com.mojitowallet;

import android.content.Intent;
import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.launch_screen);

        Intent fcmIntent = this.getIntent();
        Bundle bundle = fcmIntent.getExtras();

        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtras(fcmIntent);
        startActivity(intent);
        finish();
    }
}
