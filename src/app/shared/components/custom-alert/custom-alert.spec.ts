import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomAlert } from './custom-alert';

describe('CustomAlert', () => {
  let component: CustomAlert;
  let fixture: ComponentFixture<CustomAlert>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomAlert]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomAlert);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
