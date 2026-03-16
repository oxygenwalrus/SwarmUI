#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while running tauri application");

  // Attempt to locate the SwarmUI root directory (where launch scripts are)
  let mut backend_dir = std::env::current_exe().unwrap_or_else(|_| std::path::PathBuf::from("."));
  
  let mut found_dir = None;
  for _ in 0..6 {
      if let Some(parent) = backend_dir.parent() {
          backend_dir = parent.to_path_buf();
          if backend_dir.join("launch-windows.bat").exists() {
              found_dir = Some(backend_dir.clone());
              break;
          }
      } else {
          break;
      }
  }

  let mut backend_child = None;

  if let Some(dir) = found_dir {
      #[cfg(target_os = "windows")]
      let script = "launch-windows.bat";
      #[cfg(target_os = "linux")]
      let script = "launch-linux.sh";
      #[cfg(target_os = "macos")]
      let script = "launch-macos.sh";

      let mut cmd = std::process::Command::new(if cfg!(target_os = "windows") { "cmd.exe" } else { "sh" });
      if cfg!(target_os = "windows") {
          cmd.arg("/C").arg(script);
      } else {
          cmd.arg(script);
      }
      
      cmd.arg("--launch_mode").arg("none")
         .current_dir(dir);

      match cmd.spawn() {
          Ok(child) => {
              println!("Spawned backend sidecar alongside Tauri.");
              backend_child = Some(child);
          }
          Err(e) => {
              eprintln!("Failed to start SwarmUI backend sidecar: {}", e);
          }
      }
  } else {
      eprintln!("Could not find SwarmUI launch scripts. Running frontend only.");
  }

  app.run(move |_app_handle, event| {
      if let tauri::RunEvent::Exit = event {
          if let Some(mut child) = backend_child.take() {
              let _ = child.kill();
          }
      }
  });
}
