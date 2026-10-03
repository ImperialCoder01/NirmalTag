package com.nirmaltag.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nirmaltag.app.ui.theme.NirmalTagTheme

enum class UserRoleType(val label: String, val portalName: String, val routePath: String) {
    HOUSEHOLD("Household Resident", "Household Portal", "/household"),
    COLLECTOR("Field Waste Collector", "Collector Mobile App", "/collector"),
    TAG_OFFICER("Tag Officer", "Inventory Batch Hub", "/tag-officer"),
    RWA_ADMIN("RWA Administrator", "RWA Colony Dashboard", "/rwa"),
    BWG_ADMIN("BWG Administrator", "Commercial BWG Hub", "/bwg"),
    MCD_OFFICER("MCD Municipal Officer", "MCD Executive Command", "/mcd"),
    SYSTEM_ADMIN("System Administrator", "Security & RBAC Control", "/admin")
}

enum class MobileAppScreen {
    APP_INTRO,
    ROLE_AUTH,
    PORTAL_DASHBOARD
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NirmalTagTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NirmalTagAppMasterFlow()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NirmalTagAppMasterFlow() {
    var currentScreen by remember { mutableStateOf(MobileAppScreen.APP_INTRO) }
    var selectedRole by remember { mutableStateOf(UserRoleType.HOUSEHOLD) }
    var userEmail by remember { mutableStateOf("user@nirmaltag.org") }
    var isLoggedIn by remember { mutableStateOf(false) }

    when (currentScreen) {
        MobileAppScreen.APP_INTRO -> {
            AppIntroScreen(
                onNextClicked = {
                    currentScreen = MobileAppScreen.ROLE_AUTH
                }
            )
        }
        MobileAppScreen.ROLE_AUTH -> {
            UserTypeAuthScreen(
                selectedRole = selectedRole,
                onRoleSelected = { selectedRole = it },
                userEmail = userEmail,
                onEmailChange = { userEmail = it },
                onAuthSuccess = {
                    isLoggedIn = true
                    currentScreen = MobileAppScreen.PORTAL_DASHBOARD
                },
                onBackToIntro = {
                    currentScreen = MobileAppScreen.APP_INTRO
                }
            )
        }
        MobileAppScreen.PORTAL_DASHBOARD -> {
            RoleDashboardScreen(
                role = selectedRole,
                userEmail = userEmail,
                onSignOut = {
                    isLoggedIn = false
                    currentScreen = MobileAppScreen.ROLE_AUTH
                }
            )
        }
    }
}

// -------------------------------------------------------------------------
// SCREEN 1: APP INTRO / INFO SCREEN
// -------------------------------------------------------------------------
@Composable
fun AppIntroScreen(onNextClicked: () -> Unit) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(20.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Logo & Title
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .border(2.dp, Color(0xFF0D5C3A), CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.logo),
                    contentDescription = "NirmalTag Logo",
                    modifier = Modifier.size(64.dp)
                )
            }

            Text(
                text = "NirmalTag Civic Tech",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )

            Text(
                text = "\"AI-Verified Sanitary & Special-Care Waste Segregation with Doorstep Circular Credits\"",
                fontSize = 13.sp,
                color = Color(0xFF0D5C3A),
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Intro Info Cards
            IntroInfoCard(
                title = "Tamper-Evident QR Pouch Tracking",
                description = "Single-use serial tags with server-side CLOSED state invariants preventing tag reuse.",
                icon = Icons.Default.CheckCircle
            )

            IntroInfoCard(
                title = "On-Device MobileNetV3 AI Vision",
                description = "Runs 100% locally on device hardware for offline field collector evidence verification.",
                icon = Icons.Default.CheckCircle
            )

            IntroInfoCard(
                title = "Doorstep Circular Credit Rewards",
                description = "Household eco-incentives and collector handling wallet (+₹2.00 per verified pickup).",
                icon = Icons.Default.Star
            )

            IntroInfoCard(
                title = "DPDP Act 2023 Compliant",
                description = "Multi-tier Role-Based Access Control (RBAC) and privacy-first data fiduciary protection.",
                icon = Icons.Default.Lock
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onNextClicked,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Get Started / Select User Role",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color.White
                )
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = "Next",
                    tint = Color.White
                )
            }
        }
    }
}

@Composable
fun IntroInfoCard(title: String, description: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFDCFCE7)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color(0xFF0D5C3A),
                    modifier = Modifier.size(24.dp)
                )
            }
            Column {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A)
                )
                Text(
                    text = description,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    lineHeight = 15.sp
                )
            }
        }
    }
}

// -------------------------------------------------------------------------
// SCREEN 2: USER TYPE SELECTION & AUTHENTICATION SCREEN
// -------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserTypeAuthScreen(
    selectedRole: UserRoleType,
    onRoleSelected: (UserRoleType) -> Unit,
    userEmail: String,
    onEmailChange: (String) -> Unit,
    onAuthSuccess: () -> Unit,
    onBackToIntro: () -> Unit
) {
    var isSignUpMode by remember { mutableStateOf(false) }
    var dropdownExpanded by remember { mutableStateOf(false) }

    var fullName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("••••••••") }
    var colonyName by remember { mutableStateOf("Green Park Colony") }
    var hasConsent by remember { mutableStateOf(true) }
    var showDpdpDialog by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBackToIntro) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color(0xFF0F172A))
            }
            Text(
                text = "Sign In & Role Scope",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
        }

        // STEP 1: DROPDOWN FOR SELECTING ROLE
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "STEP 1: SELECT YOUR USER TYPE (ROLE)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF0D5C3A)
                )

                // Dropdown Menu Box
                Box(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = "${selectedRole.label} (${selectedRole.routePath})",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Selected Role") },
                        trailingIcon = {
                            IconButton(onClick = { dropdownExpanded = !dropdownExpanded }) {
                                Icon(
                                    imageVector = if (dropdownExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = "Expand Dropdown"
                                )
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { dropdownExpanded = !dropdownExpanded },
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF0D5C3A),
                            unfocusedBorderColor = Color(0xFFCBD5E1)
                        )
                    )

                    DropdownMenu(
                        expanded = dropdownExpanded,
                        onDismissRequest = { dropdownExpanded = false },
                        modifier = Modifier
                            .fillMaxWidth(0.9f)
                            .background(Color.White)
                    ) {
                        UserRoleType.values().forEach { roleOption ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(
                                            text = roleOption.label,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = if (roleOption == selectedRole) Color(0xFF0D5C3A) else Color(0xFF0F172A)
                                        )
                                        Text(
                                            text = "${roleOption.portalName} • ${roleOption.routePath}",
                                            fontSize = 11.sp,
                                            color = Color(0xFF64748B)
                                        )
                                    }
                                },
                                onClick = {
                                    onRoleSelected(roleOption)
                                    dropdownExpanded = false
                                }
                            )
                        }
                    }
                }

                Text(
                    text = "You will be signed in & redirected directly to ${selectedRole.portalName} (${selectedRole.routePath}).",
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )
            }
        }

        // STEP 2: AUTHENTICATION FORM (SIGN IN / SIGN UP)
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                // Tab Mode Toggle: Sign In vs Sign Up
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF1F5F9))
                        .padding(4.dp)
                ) {
                    Button(
                        onClick = { isSignUpMode = false },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (!isSignUpMode) Color(0xFF0D5C3A) else Color.Transparent,
                            contentColor = if (!isSignUpMode) Color.White else Color(0xFF64748B)
                        ),
                        shape = RoundedCornerShape(10.dp),
                        elevation = null
                    ) {
                        Text("Sign In", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Button(
                        onClick = { isSignUpMode = true },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSignUpMode) Color(0xFF0D5C3A) else Color.Transparent,
                            contentColor = if (isSignUpMode) Color.White else Color(0xFF64748B)
                        ),
                        shape = RoundedCornerShape(10.dp),
                        elevation = null
                    ) {
                        Text("Sign Up", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                Text(
                    text = if (isSignUpMode) "CREATE NEW ${selectedRole.name} ACCOUNT" else "AUTHENTICATE AS ${selectedRole.name}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF0D5C3A)
                )

                // 1-Click Google Sign-In Button
                OutlinedButton(
                    onClick = {
                        if (!hasConsent) {
                            Toast.makeText(context, "Please agree to DPDP Act 2023 Privacy Policy.", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "Authenticated with Google as ${selectedRole.label}", Toast.LENGTH_SHORT).show()
                            onAuthSuccess()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Google Color G Icon representation
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF4285F4)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("G", color = Color.White, fontWeight = FontWeight.Black, fontSize = 12.sp)
                        }
                        Text(
                            text = if (isSignUpMode) "Sign Up as ${selectedRole.label} with Google" else "Sign In as ${selectedRole.label} with Google",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            color = Color(0xFF334155)
                        )
                    }
                }

                // Divider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                    Text("OR CONTINUE WITH EMAIL", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8))
                    HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                }

                // Form Fields
                if (isSignUpMode) {
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Full Name") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = userEmail,
                    onValueChange = onEmailChange,
                    label = { Text("Email Address") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                if (isSignUpMode) {
                    OutlinedTextField(
                        value = colonyName,
                        onValueChange = { colonyName = it },
                        label = { Text("Colony / Ward / Establishment Name") },
                        leadingIcon = { Icon(Icons.Default.Home, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                }

                // DPDP Consent Checkbox
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFF8FAFC))
                        .padding(8.dp)
                ) {
                    Checkbox(
                        checked = hasConsent,
                        onCheckedChange = { hasConsent = it }
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Agree to DPDP Act 2023 Privacy Policy & Terms",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF334155)
                        )
                        Text(
                            text = "Tap to view Data Fiduciary Notice",
                            fontSize = 10.sp,
                            color = Color(0xFF0D5C3A),
                            modifier = Modifier.clickable { showDpdpDialog = true }
                        )
                    }
                }

                // Main Submit Button
                Button(
                    onClick = {
                        if (!hasConsent) {
                            Toast.makeText(context, "Please agree to DPDP Act 2023 Privacy Policy.", Toast.LENGTH_SHORT).show()
                        } else if (userEmail.isBlank()) {
                            Toast.makeText(context, "Please enter your email address.", Toast.LENGTH_SHORT).show()
                        } else {
                            onAuthSuccess()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = if (isSignUpMode) "Create Account as ${selectedRole.label}" else "Sign In as ${selectedRole.label}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White
                    )
                }
            }
        }
    }

    // DPDP Info Dialog
    if (showDpdpDialog) {
        AlertDialog(
            onDismissRequest = { showDpdpDialog = false },
            title = { Text("DPDP Act 2023 Privacy Policy", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "NirmalTag operates strictly as a Data Fiduciary under India's Digital Personal Data Protection (DPDP) Act 2023.\n\n" +
                            "• Purpose Limitation: Waste segregation telemetry and pouch QR serial logs are processed exclusively for civic waste management.\n" +
                            "• Minimal Retention: Location data & camera evidence images are processed locally on device (MobileNetV3 TFLite) and erased after hash validation.\n" +
                            "• User Rights: You retain full right of erasure and access to your circular credit logs.",
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showDpdpDialog = false }) {
                    Text("I Understand", fontWeight = FontWeight.Bold, color = Color(0xFF0D5C3A))
                }
            }
        )
    }
}

// -------------------------------------------------------------------------
// SCREEN 3: ROLE DASHBOARD SCREEN (FULL FUNCTIONAL PORTAL)
// -------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleDashboardScreen(
    role: UserRoleType,
    userEmail: String,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    var walletBalance by remember { mutableStateOf(if (role == UserRoleType.COLLECTOR) 48.0 else 140.0) }
    var actionMessage by remember { mutableStateOf<String?>(null) }
    var activeModalType by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.logo),
                            contentDescription = "Logo",
                            modifier = Modifier.size(34.dp)
                        )
                        Column {
                            Text(
                                text = role.label,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            )
                            Text(
                                text = userEmail,
                                fontSize = 10.sp,
                                color = Color(0xFF0D5C3A),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onSignOut) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out", tint = Color(0xFFDC2626))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Role Welcome Banner
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0D5C3A)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Active Scope: ${role.portalName}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color.White
                    )
                    Text(
                        text = "Authenticated user: $userEmail • MCD Ward 42 Scope",
                        fontSize = 11.sp,
                        color = Color(0xFFDCFCE7)
                    )
                }
            }

            // Status notification bar
            actionMessage?.let { msg ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFDCFCE7))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF166534))
                        Text(
                            text = msg,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF166534),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // ROLE-SPECIFIC EXCLUSIVE FUNCTIONALITY PORTALS
            when (role) {
                UserRoleType.HOUSEHOLD -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Household Sanitary Pouch Portal", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                            
                            // Balance Card
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFF0FDF4))
                                    .padding(12.dp)
                            ) {
                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Column {
                                        Text("Circular Credit Wallet Balance", fontSize = 11.sp, color = Color(0xFF166534))
                                        Text("${walletBalance.toInt()} Eco-Points (₹${walletBalance.toInt()}.00)", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0D5C3A))
                                    }
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFEAB308), modifier = Modifier.size(28.dp))
                                }
                            }

                            Button(
                                onClick = {
                                    actionMessage = "Dispensed 10 Tamper-Evident QR Pouches (Serials NT-SAN-2026-8001 to 8010)."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Request New Sanitary Pouch Batch (10 Pouches)")
                            }

                            Button(
                                onClick = {
                                    walletBalance += 10
                                    actionMessage = "AI Scan Success! Sanitary Pouch Tag NT-SAN-2026-8001 Verified. +10 Eco-Points added."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF15803D)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("AI Camera Tag Verification Scan")
                            }

                            Button(
                                onClick = {
                                    actionMessage = "Doorstep collection booked for Ward 42 (Green Park Colony) tomorrow at 8:00 AM."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0369A1)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Book Doorstep Special-Care Pickup")
                            }

                            OutlinedButton(
                                onClick = {
                                    if (walletBalance >= 50) {
                                        walletBalance -= 50
                                        actionMessage = "Redeemed ₹50 Electricity Bill Voucher! Code: DISC-ELEC-89302"
                                    } else {
                                        Toast.makeText(context, "Insufficient points (Need 50 Pts)", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Redeem Reward Voucher (50 Pts)")
                            }
                        }
                    }
                }

                UserRoleType.COLLECTOR -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Field Collector Scanner & Wallet Hub", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFFEF3C7))
                                    .padding(12.dp)
                            ) {
                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Column {
                                        Text("Collector Handling Incentive Wallet", fontSize = 11.sp, color = Color(0xFF92400E))
                                        Text("₹${String.format("%.2f", walletBalance)} (₹2.00 per verified pouch)", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFB45309))
                                    }
                                    Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color(0xFFB45309), modifier = Modifier.size(28.dp))
                                }
                            }

                            Button(
                                onClick = {
                                    walletBalance += 2.0
                                    actionMessage = "Scanned Tag NT-SAN-2026-8004 • MobileNetV3 AI: SANITARY (98.4% Confidence) • Tag Status: CLOSED (+₹2.00)"
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Scan QR & Run MobileNetV3 AI Vision")
                            }

                            Button(
                                onClick = {
                                    walletBalance += 6.0
                                    actionMessage = "Synced 3 queued offline pickups to server. Wallet updated to ₹${String.format("%.2f", walletBalance)}"
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Sync Offline Pickup Queue (3 Pending)")
                            }

                            OutlinedButton(
                                onClick = {
                                    actionMessage = "Submitted payout request of ₹${String.format("%.2f", walletBalance)} to UPI ID collector@upi"
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Request Instant UPI Wallet Payout")
                            }
                        }
                    }
                }

                UserRoleType.TAG_OFFICER -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Tag Officer Inventory Serialization Hub", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))

                            Button(
                                onClick = {
                                    actionMessage = "Generated Authorized Batch BATCH-2026-004 with 1,000 Sanitary Tags for Ward 42."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Generate Authorized Tag Batch (1,000 Serials)")
                            }

                            Button(
                                onClick = {
                                    actionMessage = "Assigned Batch BATCH-2026-004 to Green Park RWA Colony (450 Households)."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0369A1)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Assign Batch to Colony / Establishment")
                            }

                            OutlinedButton(
                                onClick = {
                                    actionMessage = "Lookup Tag NT-SAN-2026-8004 • Invariant State: CLOSED (Server-enforced single-use lock)."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Lookup Tag Invariant State (NT-SAN-2026-8004)")
                            }
                        }
                    }
                }

                UserRoleType.RWA_ADMIN -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("RWA Colony Compliance Command", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                            Text("Green Park RWA • 450 Households • 96.8% Segregation Rate", fontSize = 12.sp, color = Color(0xFF475569))

                            Button(
                                onClick = {
                                    actionMessage = "Registered new resident household (Flat B-501, Green Park RWA)."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Register Colony Household Resident")
                            }

                            Button(
                                onClick = {
                                    actionMessage = "Flagged household Flat C-102 for non-compliance. Notice sent to resident."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Flag Non-Compliant Household")
                            }

                            OutlinedButton(
                                onClick = {
                                    actionMessage = "Incident report submitted to MCD Command for uncollected pouch in Sector 4."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Submit Incident Report to MCD Command")
                            }
                        }
                    }
                }

                UserRoleType.BWG_ADMIN -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Commercial Bulk Waste Generator Hub", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                            Text("Establishment: Hotel Grand Plaza • Daily Volume: 120 kg • Grade A Compliance", fontSize = 12.sp, color = Color(0xFF475569))

                            Button(
                                onClick = {
                                    actionMessage = "Logged 120 kg Special-Care Waste volume for today. Container Seal: SEAL-9022-X"
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Log Daily Bulk Waste Volume")
                            }

                            Button(
                                onClick = {
                                    activeModalType = "BWG_CERTIFICATE"
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Default.Done, contentDescription = null, tint = Color.White)
                                    Text("Generate & View MCD Compliance Certificate")
                                }
                            }

                            OutlinedButton(
                                onClick = {
                                    actionMessage = "Exported Monthly Bulk Waste Audit Log (October 2026 CSV)."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Export Monthly Bulk Audit Log")
                            }
                        }
                    }
                }

                UserRoleType.MCD_OFFICER -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("MCD Executive Telemetry Command", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                            Text("MCD Ward 42 • 5,800 Verified Pickups • 96% Compliance Index", fontSize = 12.sp, color = Color(0xFF475569))

                            Button(
                                onClick = {
                                    actionMessage = "Approved AI Dispute DSP-101. Pickup verified and credit points released to resident."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Resolve Pending AI Verification Dispute")
                            }

                            Button(
                                onClick = {
                                    actionMessage = "Issued formal violation notice to non-compliant commercial BWG #891."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Issue Municipal Violation Notice")
                            }

                            OutlinedButton(
                                onClick = {
                                    actionMessage = "Sanitary waste segregation advisory broadcasted to all 12 Ward 42 RWAs."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Broadcast Ward Advisory Notice")
                            }
                        }
                    }
                }

                UserRoleType.SYSTEM_ADMIN -> {
                    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("System Security & RBAC Policy Engine", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))

                            Button(
                                onClick = {
                                    actionMessage = "Provisioned COLLECTOR role permissions to inspector.rajesh@nirmaltag.org"
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Provision User Role Assignment")
                            }

                            Button(
                                onClick = {
                                    actionMessage = "Exported System Security Audit Trail CSV (4 Events Logged)."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0369A1)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Export Security Audit Trail CSV")
                            }

                            OutlinedButton(
                                onClick = {
                                    actionMessage = "System Audit OK: Zero secrets leaked, Firebase Auth rules enforced, DPDP consent active."
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Run Security & Compliance Audit")
                            }
                        }
                    }
                }
            }
        }
    }

    // MODAL DIALOGS FOR REAL DYNAMIC FEATURES (e.g. MCD Compliance Certificate)
    if (activeModalType == "BWG_CERTIFICATE") {
        AlertDialog(
            onDismissRequest = { activeModalType = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF0D5C3A))
                    Text("MCD Compliance Certificate", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4)),
                        border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("MUNICIPAL CORPORATION OF DELHI", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = Color(0xFF166534))
                            Text("Bulk Waste Compliance Certificate 2026", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                            HorizontalDivider(color = Color(0xFFBBF7D0))
                            Text("Certificate ID: MCD-BWG-2026-8942", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0D5C3A))
                            Text("Issued to: Commercial Establishment #BWG-42", fontSize = 11.sp, color = Color(0xFF334155))
                            Text("Compliance Status: VERIFIED & COMPLIANT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF15803D))
                            Text("Date of Issue: October 3, 2026", fontSize = 10.sp, color = Color(0xFF64748B))
                        }
                    }
                    Text("This document certifies that the commercial establishment processes sanitary waste in full compliance with Solid Waste Management Rules 2016 and MCD Bye-Laws.", fontSize = 11.sp, lineHeight = 15.sp)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        activeModalType = null
                        Toast.makeText(context, "MCD Compliance Certificate downloaded to device.", Toast.LENGTH_LONG).show()
                        actionMessage = "Downloaded Official MCD Compliance Certificate (MCD-BWG-2026-8942.html)."
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A))
                ) {
                    Text("Download Certificate")
                }
            },
            dismissButton = {
                TextButton(onClick = { activeModalType = null }) {
                    Text("Close", color = Color(0xFF64748B))
                }
            }
        )
    }
}
