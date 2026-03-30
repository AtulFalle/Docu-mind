import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './ui/header/header';

@Component({
  imports: [RouterModule, HeaderComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly title = 'documind-ui';
}
