import 'zone.js';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles.css';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { sessionInterceptor } from './app/core/interceptors/session.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([sessionInterceptor])),
    provideAnimations(),
    provideIonicAngular({
      mode: 'md',
      animated: true
    })
  ]
}).catch((err) => {
  console.error(err);
  const root = document.querySelector('app-root');
  const message = root?.querySelector('.bootstrap-status__panel span');
  const heading = root?.querySelector('.bootstrap-status__panel strong');
  if (heading) heading.textContent = 'FieldRelay could not start';
  if (message) {
    message.textContent = 'Reload this page. If the problem continues, open the application in a private browser window.';
  }
});
