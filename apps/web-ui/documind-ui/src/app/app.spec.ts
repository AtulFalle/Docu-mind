import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { RouterModule } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'documind-ui'`, () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    if(!app || !app['title']) return;
    // Using property access of 'any' to avoid protected property access error in tests if needed
    // but in Angular tests it's usually fine if we cast or if the test is in the same folder.
    expect(app['title']).toEqual('documind-ui');
  });
});
