import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { DRIVE_TASK, flushDrive } from './drive.native';
TaskManager.defineTask(DRIVE_TASK, async () => {
  try { await flushDrive(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});
