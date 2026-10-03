package com.nirmaltag.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BrandGreenPrimary = Color(0xFF0D5C3A)
val BrandGreenSecondary = Color(0xFF16A34A)
val BrandGold = Color(0xFFD4AF37)
val BackgroundLight = Color(0xFFF8FAFC)

private val LightColorScheme = lightColorScheme(
    primary = BrandGreenPrimary,
    secondary = BrandGreenSecondary,
    tertiary = BrandGold,
    background = BackgroundLight,
    surface = Color.White
)

@Composable
fun NirmalTagTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
